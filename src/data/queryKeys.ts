import type { ContentListName } from 'data/pendingActions';

export const queryKeys = {
  semesters: ['semesters'] as const,
  // Its key from when only the timetable asked for the dates.
  schoolSemester: ['semesterDates'] as const,
  user: ['user'] as const,
  coursesAll: ['courses'] as const,
  courses: (semesterId: string) => ['courses', semesterId] as const,
  /** Every semester's list of notices, assignments or files. */
  contentAll: (list: ContentListName) => [list] as const,
  /** A semester's notices, assignments or files (`data/content`). */
  content: (list: ContentListName, semesterId: string) =>
    [list, semesterId] as const,
  excellentHomework: (id: string) => ['excellentHomework', id] as const,
};
