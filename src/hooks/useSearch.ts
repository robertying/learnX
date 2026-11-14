import { useDeferredValue } from 'react';
import dayjs from 'dayjs';
import Fuse, { IFuseOptions } from 'fuse.js';
import { Assignment, File, Notice } from 'data/types/state';
import {
  hasHan,
  queryWords,
  SearchSpec,
  SearchTier,
  searchItems,
} from 'helpers/search';
import { removeTags } from 'helpers/text';
import { useMinute } from 'hooks/useClock';

const noticeSpec: SearchSpec<Notice> = {
  fields: [
    { get: n => n.title, tier: SearchTier.Title, abbreviations: true },
    { get: n => n.courseName, tier: SearchTier.Course, abbreviations: true },
    { get: n => n.attachment?.name, tier: SearchTier.Name },
    { get: n => [n.publisher, n.courseTeacherName], tier: SearchTier.Person },
    { get: n => removeTags(n.content), tier: SearchTier.Body },
  ],
  attention: n => !n.hasRead,
};

const assignmentSpec: SearchSpec<Assignment> = {
  fields: [
    { get: a => a.title, tier: SearchTier.Title, abbreviations: true },
    { get: a => a.courseName, tier: SearchTier.Course, abbreviations: true },
    {
      get: a => [
        a.attachment?.name,
        a.submittedAttachment?.name,
        a.gradeAttachment?.name,
        a.answerAttachment?.name,
      ],
      tier: SearchTier.Name,
    },
    { get: a => [a.courseTeacherName, a.graderName], tier: SearchTier.Person },
    {
      get: a => [
        removeTags(a.description),
        removeTags(a.submittedContent),
        removeTags(a.gradeContent),
        removeTags(a.answerContent),
      ],
      tier: SearchTier.Body,
    },
  ],
  attention: (a, now) => !a.submitted && dayjs(a.deadline).valueOf() > now,
};

const fileSpec: SearchSpec<File> = {
  fields: [
    { get: f => f.title, tier: SearchTier.Title, abbreviations: true },
    { get: f => f.courseName, tier: SearchTier.Course, abbreviations: true },
    { get: f => [f.category?.title, f.fileType], tier: SearchTier.Name },
    { get: f => f.courseTeacherName, tier: SearchTier.Person },
    { get: f => removeTags(f.description), tier: SearchTier.Body },
  ],
  attention: f => f.isNew,
};

/**
 * The fuzzy pass for English typos (`deadlnie`, `assigment`), run only when
 * nothing matches exactly. Each word of the query has to match some field
 * (token search, all words), with up to one wrong letter in four, counted
 * against the closest stretch of a field. Bodies are left out: long text
 * holds a near match for almost any word.
 */
const fuzzyOptions = <T>(spec: SearchSpec<T>): IFuseOptions<T> => ({
  keys: spec.fields
    .filter(field => field.tier !== SearchTier.Body)
    .map((field, i) => ({
      name: String(i),
      getFn: (item: T) => {
        const value = field.get(item);
        return (Array.isArray(value) ? value : [value]).filter(
          (text): text is string => !!text,
        );
      },
    })),
  useTokenSearch: true,
  tokenMatch: 'all',
  threshold: 0.25,
});

/** Whether a query may have a typo the fuzzy pass could fix. */
const fuzzyQuery = (query: string) =>
  !hasHan(query) && queryWords(query).some(word => word.length >= 4);

export interface SearchResults {
  notices: Notice[];
  assignments: Assignment[];
  files: File[];
}

const noResults: SearchResults = { notices: [], assignments: [], files: [] };

/**
 * The notices, assignments and files that match `query`, best first (see
 * `helpers/search`). The search follows typing at a lower priority
 * (`useDeferredValue`), so a keystroke shows before the search finishes.
 */
export default function useSearch(
  notices: Notice[],
  assignments: Assignment[],
  files: File[],
  query: string,
): SearchResults {
  const deferredQuery = useDeferredValue(query);
  const now = useMinute();
  if (!deferredQuery.trim()) {
    return noResults;
  }
  const results = {
    notices: searchItems(notices, deferredQuery, noticeSpec, now),
    assignments: searchItems(assignments, deferredQuery, assignmentSpec, now),
    files: searchItems(files, deferredQuery, fileSpec, now),
  };
  const found =
    results.notices.length + results.assignments.length + results.files.length;
  if (found || !fuzzyQuery(deferredQuery)) {
    return results;
  }
  const fuzzy = <T>(items: T[], spec: SearchSpec<T>) =>
    new Fuse(items, fuzzyOptions(spec))
      .search(deferredQuery)
      .map(result => result.item);
  return {
    notices: fuzzy(notices, noticeSpec),
    assignments: fuzzy(assignments, assignmentSpec),
    files: fuzzy(files, fileSpec),
  };
}
