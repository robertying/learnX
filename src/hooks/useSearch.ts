import { useDeferredValue } from 'react';
import dayjs from 'dayjs';
import Fuse, { IFuseOptions } from 'fuse.js';
import { Assignment, File, Notice } from 'data/types/state';
import {
  hasHan,
  queryWords,
  SearchHit,
  SearchSpec,
  SearchTier,
  searchHits,
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

export type SearchKind = 'notice' | 'assignment' | 'file';

/** A result of any kind, as the overview's top hits list them. */
export type TopHit =
  | { kind: 'notice'; item: Notice }
  | { kind: 'assignment'; item: Assignment }
  | { kind: 'file'; item: File };

export interface SearchResults {
  /** The query's words, for showing where results matched. */
  words: string[];
  notices: Notice[];
  assignments: Assignment[];
  files: File[];
  /**
   * The best results of every kind, at most `topHitCount`: those where every
   * word matched a title or a course name. Empty for a fuzzy match.
   */
  topHits: TopHit[];
}

export const topHitCount = 3;

const noResults: SearchResults = {
  words: [],
  notices: [],
  assignments: [],
  files: [],
  topHits: [],
};

const items = <T>(hits: SearchHit<T>[]) => hits.map(({ item }) => item);

/**
 * The notices, assignments and files that match `query`, best first (see
 * `helpers/search`), and the best of them all. The search follows typing at
 * a lower priority (`useDeferredValue`), so a keystroke shows before the
 * search finishes.
 */
export default function useSearch(
  notices: Notice[],
  assignments: Assignment[],
  files: File[],
  query: string,
): SearchResults {
  const deferredQuery = useDeferredValue(query);
  const now = useMinute();
  const words = queryWords(deferredQuery);
  if (!words.length) {
    return noResults;
  }
  const hits = {
    notice: searchHits(notices, deferredQuery, noticeSpec, now),
    assignment: searchHits(assignments, deferredQuery, assignmentSpec, now),
    file: searchHits(files, deferredQuery, fileSpec, now),
  };
  const found = hits.notice.length + hits.assignment.length + hits.file.length;
  if (found) {
    // Every word in a title or course name (an abbreviation of one counts).
    const topScore = words.length * SearchTier.Course * 10;
    const topHits = (['assignment', 'notice', 'file'] as const)
      .flatMap(kind =>
        hits[kind]
          .filter(hit => hit.score >= topScore)
          .map(hit => ({ ...hit, kind })),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, topHitCount)
      .map(({ kind, item }) => ({ kind, item }) as TopHit);
    return {
      words,
      notices: items(hits.notice),
      assignments: items(hits.assignment),
      files: items(hits.file),
      topHits,
    };
  }
  if (!fuzzyQuery(deferredQuery)) {
    return { ...noResults, words };
  }
  const fuzzy = <T>(list: T[], spec: SearchSpec<T>) =>
    new Fuse(list, fuzzyOptions(spec))
      .search(deferredQuery)
      .map(result => result.item);
  return {
    words,
    notices: fuzzy(notices, noticeSpec),
    assignments: fuzzy(assignments, assignmentSpec),
    files: fuzzy(files, fileSpec),
    topHits: [],
  };
}
