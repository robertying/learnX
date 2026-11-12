// Content for the card tests: a notice, an assignment, a file and a course,
// with times around a fixed now.
import dayjs from 'dayjs';
import type { Assignment, Course, File, Notice } from 'data/types/state';

export const NOW = new Date('2026-03-10T12:00:00+08:00');

export const daysFromNow = (days: number) =>
  dayjs(NOW).add(days, 'day').toISOString();

export const notice = (overrides: Partial<Notice> = {}) =>
  ({
    id: 'n1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Midterm room change',
    content: '<p>Moved to <b>Room&nbsp;101</b></p>',
    publisher: 'TA Wang',
    publishTime: daysFromNow(-2),
    markedImportant: false,
    hasRead: true,
    ...overrides,
  }) as Notice;

export const assignment = (overrides: Partial<Assignment> = {}) =>
  ({
    id: 'a1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Problem set 3',
    description: '<p>Chapters 4 &amp; 5</p>',
    deadline: daysFromNow(3),
    submitted: false,
    graded: false,
    ...overrides,
  }) as Assignment;

export const file = (overrides: Partial<File> = {}) =>
  ({
    id: 'f1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Lecture 5 slides',
    description: '',
    size: '2.1 MB',
    fileType: 'pdf',
    markedImportant: false,
    isNew: false,
    uploadTime: daysFromNow(-1),
    category: { id: 'cat', title: 'Slides' },
    ...overrides,
  }) as File;

export const course = {
  id: 'c1',
  name: 'Calculus',
  teacherName: 'Prof. Li',
  semesterId: '2025-2026-2',
  unreadNoticeCount: 2,
  unfinishedAssignmentCount: 1,
  unreadFileCount: 0,
} as Course & {
  unreadNoticeCount: number;
  unfinishedAssignmentCount: number;
  unreadFileCount: number;
};
