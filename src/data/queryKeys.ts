import type { ContentListName } from 'data/types/state';

export const queryKeys = {
  semesters: ['semesters'] as const,
  schoolSemester: ['schoolSemester'] as const,
  user: ['user'] as const,
  coursesAll: ['courses'] as const,
  courses: (semesterId: string) => ['courses', semesterId] as const,
  /** Every semester's list of notices, assignments or files. */
  contentAll: (list: ContentListName) => [list] as const,
  /** A semester's notices, assignments or files (`data/content`). */
  content: (list: ContentListName, semesterId: string) =>
    [list, semesterId] as const,
  excellentHomework: (id: string) => ['excellentHomework', id] as const,
  /** Every week of the registrar's calendar (`data/schedule`). */
  calendarAll: ['calendar'] as const,
  /** The registrar's calendar for the week starting `weekStart`. */
  calendar: (weekStart: string, graduate: boolean) =>
    ['calendar', weekStart, graduate ? 'graduate' : 'undergraduate'] as const,
};
