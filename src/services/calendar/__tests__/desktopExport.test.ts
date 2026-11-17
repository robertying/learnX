import dayjs from 'dayjs';
import { ensureSession } from 'data/source';
import { fetchCalendarRange } from 'data/schedule';
import { queryClient } from 'data/queryClient';
import { assignmentsQuery } from 'data/content';
import { coursesQuery, schoolSemesterQuery } from 'data/queries';
import { setCurrentSemester, setArchived, resetUserData } from 'data/userData';
import { buildDesktopICS } from 'services/calendar/desktopExport';
import { CalendarError } from 'services/calendar/errors';
import type { Assignment, Course } from 'data/types/state';

jest.mock('data/source', () => ({ ensureSession: jest.fn(async () => {}) }));
jest.mock('data/schedule', () => ({
  ...jest.requireActual('data/schedule'),
  fetchCalendarRange: jest.fn(async () => ({ classes: [], failedRanges: [] })),
}));

const now = dayjs('2026-11-16T10:00:00+08:00');
const semester = {
  id: '2026-2027-1',
  startDate: '2026-09-14',
  endDate: '2027-01-10',
};
const course = { id: 'c1', name: 'Signals' } as Course;
const assignment = (id: string, deadline: string, extra = {}) =>
  ({
    id,
    courseId: 'c1',
    title: `Homework ${id}`,
    description: '<p>Read</p>',
    deadline,
    submitted: false,
    ...extra,
  }) as unknown as Assignment;

beforeEach(async () => {
  queryClient.clear();
  resetUserData();
  setCurrentSemester(semester.id);
  queryClient.setQueryData(schoolSemesterQuery.queryKey, semester);
  queryClient.setQueryData(coursesQuery(semester.id).queryKey, [course]);
  queryClient.setQueryData(assignmentsQuery(semester.id).queryKey, [
    assignment('1', '2026-11-20T23:59:00+08:00'),
    assignment('past', '2026-11-01T23:59:00+08:00'),
    assignment('archived', '2026-11-21T23:59:00+08:00'),
  ]);
  setArchived('assignment', ['archived'], true);
});

it("exports the semester's remaining classes and the open assignments", async () => {
  jest.mocked(fetchCalendarRange).mockResolvedValueOnce({
    classes: [
      {
        courseName: 'Signals',
        location: '六教6A118',
        start: '2026-11-17T08:00:00+08:00',
        end: '2026-11-17T09:35:00+08:00',
      },
    ],
    failedRanges: [],
  } as never);
  const ics = await buildDesktopICS(now);
  expect(fetchCalendarRange).toHaveBeenCalledWith(
    now,
    dayjs(semester.endDate),
    false,
  );
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('SUMMARY:Signals');
  expect(ics).toContain('SUMMARY:Homework 1 · Signals');
  expect(ics).toContain('UID:assignment-1@learnx');
  expect(ics).not.toContain('Homework past');
  expect(ics).not.toContain('Homework archived');
  expect(ics.indexOf('SUMMARY:Signals')).toBeLessThan(
    ics.indexOf('SUMMARY:Homework 1'),
  );
});

it('exports the assignments when the timetable fails', async () => {
  jest.mocked(fetchCalendarRange).mockRejectedValueOnce(new Error('offline'));
  await expect(buildDesktopICS(now)).resolves.toContain('Homework 1');
});

it('skips the classes after the semester has ended', async () => {
  await expect(buildDesktopICS(dayjs('2027-02-01'))).rejects.toBeInstanceOf(
    CalendarError,
  );
  expect(fetchCalendarRange).not.toHaveBeenCalled();
});

it('fails when there is nothing to export or the login fails', async () => {
  queryClient.setQueryData(assignmentsQuery(semester.id).queryKey, []);
  await expect(buildDesktopICS(now)).rejects.toMatchObject({
    code: 'noEvents',
  });
  jest.mocked(ensureSession).mockRejectedValueOnce(new Error('login'));
  await expect(buildDesktopICS(now)).rejects.toThrow('login');
  resetUserData();
  await expect(buildDesktopICS(now)).rejects.toMatchObject({
    code: 'noEvents',
  });
});
