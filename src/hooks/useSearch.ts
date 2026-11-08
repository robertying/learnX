import Fuse, { FuseGetFunction, IFuseOptions } from 'fuse.js';
import { Assignment, File, Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';

/** Fields that hold course-site HTML, searched as plain text. */
const htmlFields = new Set([
  'content',
  'description',
  'submittedContent',
  'gradeContent',
  'answerContent',
]);

const getFn: FuseGetFunction<object> = (item, path) => {
  const value = Fuse.config.getFn(item, path);
  const key = Array.isArray(path) ? path.join('.') : path;
  return htmlFields.has(key) && typeof value === 'string'
    ? removeTags(value)
    : value;
};

/**
 * Fuse only accepts a match within about 60 characters of a field's start by
 * default (`location`, `distance`), which misses most of a notice body, so
 * the position is ignored. A lower threshold keeps long bodies from matching
 * nearly any query.
 */
const baseOptions = {
  getFn,
  ignoreLocation: true,
  threshold: 0.3,
} satisfies IFuseOptions<object>;

const noticeOptions: IFuseOptions<Notice> = {
  ...baseOptions,
  keys: [
    'courseName',
    'courseTeacherName',
    'publisher',
    'attachmentName',
    { name: 'title', weight: 2 },
    { name: 'content', weight: 2 },
  ],
};

const assignmentOptions: IFuseOptions<Assignment> = {
  ...baseOptions,
  keys: [
    'courseName',
    'courseTeacherName',
    'attachmentName',
    'submittedContent',
    'submittedAttachmentName',
    'graderName',
    'gradeContent',
    'gradeAttachmentName',
    'answerContent',
    'answerAttachmentName',
    { name: 'title', weight: 2 },
    { name: 'description', weight: 2 },
  ],
};

const fileOptions: IFuseOptions<File> = {
  ...baseOptions,
  keys: [
    'courseName',
    'courseTeacherName',
    { name: 'title', weight: 2 },
    { name: 'description', weight: 2 },
    { name: 'fileType', weight: 2 },
    { name: 'category.title', weight: 2 },
  ],
};

export default function useSearch(
  notices: Notice[],
  assignments: Assignment[],
  files: File[],
  query: string,
) {
  const noticeFuse = new Fuse(notices, noticeOptions);
  const assignmentFuse = new Fuse(assignments, assignmentOptions);
  const fileFuse = new Fuse(files, fileOptions);

  return query
    ? [
        noticeFuse.search(query).map(i => i.item),
        assignmentFuse.search(query).map(i => i.item),
        fileFuse.search(query).map(i => i.item),
      ]
    : [[], [], []];
}
