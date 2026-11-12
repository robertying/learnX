import dayjs from 'dayjs';
import { countByCourse } from 'helpers/courseCounts';
import type { Assignment, File, Notice } from 'data/types/state';

const now = dayjs('2026-11-12T12:00:00+08:00').valueOf();
const notice = (id: string, courseId: string, hasRead = false) =>
  ({ id, courseId, hasRead }) as Notice;
const assignment = (
  id: string,
  courseId: string,
  deadline: string,
  submitted = false,
) => ({ id, courseId, deadline, submitted }) as Assignment;
const file = (id: string, courseId: string, isNew = true) =>
  ({ id, courseId, isNew }) as File;

describe('countByCourse', () => {
  const countsOf = countByCourse(
    {
      notices: [
        notice('n1', 'c1'),
        notice('n2', 'c1', true),
        notice('n3', 'c1'),
        notice('n4', 'c2'),
      ],
      assignments: [
        assignment('a1', 'c1', '2026-11-13T12:00:00+08:00'),
        assignment('a2', 'c1', '2026-11-11T12:00:00+08:00'),
        assignment('a3', 'c1', '2026-11-13T12:00:00+08:00', true),
        assignment('a4', 'c1', '2026-11-14T12:00:00+08:00'),
      ],
      files: [file('f1', 'c2'), file('f2', 'c2', false), file('f3', 'c2')],
    },
    { notice: ['n3'], assignment: ['a4'], file: ['f3'] },
    now,
  );

  it('counts unread notices, open assignments and new files per course', () => {
    expect(countsOf('c1')).toEqual({
      unreadNoticeCount: 1,
      unfinishedAssignmentCount: 1,
      unreadFileCount: 0,
    });
    expect(countsOf('c2')).toEqual({
      unreadNoticeCount: 1,
      unfinishedAssignmentCount: 0,
      unreadFileCount: 1,
    });
  });

  it('gives zeros for a course with nothing', () => {
    expect(countsOf('c3')).toEqual({
      unreadNoticeCount: 0,
      unfinishedAssignmentCount: 0,
      unreadFileCount: 0,
    });
  });
});
