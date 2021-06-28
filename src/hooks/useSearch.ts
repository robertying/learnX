import {useMemo} from 'react';
import Fuse from 'fuse.js';
import {Assignment, File, Notice} from 'data/types/state';

const noticeOptions: Fuse.IFuseOptions<Notice> = {
  keys: [
    'courseName',
    'courseTeacherName',
    'publisher',
    'attachmentName',
    {name: 'title', weight: 2},
    {name: 'content', weight: 2},
  ],
};

const assignmentOptions: Fuse.IFuseOptions<Assignment> = {
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
    {name: 'title', weight: 2},
    {name: 'description', weight: 2},
  ],
};

const fileOptions: Fuse.IFuseOptions<File> = {
  keys: [
    'courseName',
    'courseTeacherName',
    {name: 'title', weight: 2},
    {name: 'description', weight: 2},
    {name: 'fileType', weight: 2},
  ],
};

export default function useSearch(
  notices: Notice[],
  assignments: Assignment[],
  files: File[],
  query: string,
) {
  const noticeFuse = useMemo(() => new Fuse(notices, noticeOptions), [notices]);
  const assignmentFuse = useMemo(
    () => new Fuse(assignments, assignmentOptions),
    [assignments],
  );
  const fileFuse = useMemo(() => new Fuse(files, fileOptions), [files]);

  return [
    noticeFuse.search(query).map(i => i.item),
    assignmentFuse.search(query).map(i => i.item),
    fileFuse.search(query).map(i => i.item),
  ];
}
