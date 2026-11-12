import dayjs from 'dayjs';
import type { Assignment, File, Notice } from 'data/types/state';

export interface CourseCounts {
  unreadNoticeCount: number;
  unfinishedAssignmentCount: number;
  unreadFileCount: number;
}

const none: CourseCounts = {
  unreadNoticeCount: 0,
  unfinishedAssignmentCount: 0,
  unreadFileCount: 0,
};

/**
 * Each course's card counts, in one pass over the lists: unread notices,
 * new files and assignments still open at `now`. Archived items don't count,
 * as on Today and in the tabs.
 */
export const countByCourse = (
  {
    notices,
    assignments,
    files,
  }: { notices: Notice[]; assignments: Assignment[]; files: File[] },
  archived: { notice: string[]; assignment: string[]; file: string[] },
  now: number,
) => {
  const counts = new Map<string, CourseCounts>();
  const bump = (courseId: string, key: keyof CourseCounts) => {
    const course = counts.get(courseId) ?? { ...none };
    course[key]++;
    counts.set(courseId, course);
  };
  const archivedNotices = new Set(archived.notice);
  const archivedAssignments = new Set(archived.assignment);
  const archivedFiles = new Set(archived.file);

  for (const notice of notices) {
    if (!notice.hasRead && !archivedNotices.has(notice.id)) {
      bump(notice.courseId, 'unreadNoticeCount');
    }
  }
  for (const assignment of assignments) {
    if (
      !assignment.submitted &&
      dayjs(assignment.deadline).valueOf() > now &&
      !archivedAssignments.has(assignment.id)
    ) {
      bump(assignment.courseId, 'unfinishedAssignmentCount');
    }
  }
  for (const file of files) {
    if (file.isNew && !archivedFiles.has(file.id)) {
      bump(file.courseId, 'unreadFileCount');
    }
  }
  return (courseId: string) => counts.get(courseId) ?? none;
};
