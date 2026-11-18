import dayjs from 'dayjs';
import { ensureSession } from 'data/source';
import { fetchCalendarRange } from 'data/schedule';
import { queryClient } from 'data/queryClient';
import { assignmentsQuery } from 'data/content';
import { coursesQuery, schoolSemesterQuery } from 'data/queries';
import { setCurrentSemester, setArchived, resetUserData } from 'data/userData';
import {
  buildElectronICS,
  defaultExportRange,
} from 'services/calendar/electronExport';
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
const range = { start: now, end: dayjs(semester.endDate) };
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

it('exports the classes and the open assignments in the range', async () => {
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
  const { ics, withoutClasses } = await buildElectronICS(range, now);
  expect(withoutClasses).toBe(false);
  expect(fetchCalendarRange).toHaveBeenCalledWith(
    now.startOf('day'),
    dayjs(semester.endDate).endOf('day'),
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
  // Open as of now by default: Homework 1 is due 2026-11-20.
  jest.useFakeTimers({ now: now.valueOf() });
  const { ics, withoutClasses } = await buildElectronICS(range);
  expect(ics).toContain('Homework 1');
  expect(withoutClasses).toBe(true);
});

it('leaves out assignments due outside the range', async () => {
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
  const { ics } = await buildElectronICS(
    { start: now, end: dayjs('2026-11-19') },
    now,
  );
  expect(ics).not.toContain('Homework 1');
  await expect(
    buildElectronICS(
      { start: dayjs('2026-11-21'), end: dayjs('2026-11-30') },
      now,
    ),
  ).rejects.toBeInstanceOf(CalendarError);
});

it("offers today to the semester's end, or four weeks once it's over", async () => {
  await expect(defaultExportRange(now)).resolves.toEqual({
    start: now.startOf('day'),
    end: dayjs(semester.endDate),
  });
  const later = dayjs('2027-02-01T10:00:00+08:00');
  await expect(defaultExportRange(later)).resolves.toEqual({
    start: later.startOf('day'),
    end: later.startOf('day').add(28, 'day'),
  });
  // From the current day by default.
  expect((await defaultExportRange()).start.isSame(dayjs(), 'day')).toBe(true);
  queryClient.clear();
  jest.spyOn(queryClient, 'fetchQuery').mockRejectedValueOnce(new Error('x'));
  await expect(defaultExportRange(now)).resolves.toEqual({
    start: now.startOf('day'),
    end: now.startOf('day').add(28, 'day'),
  });
});

it('fails when there is nothing to export or the login fails', async () => {
  queryClient.setQueryData(assignmentsQuery(semester.id).queryKey, []);
  await expect(buildElectronICS(range, now)).rejects.toMatchObject({
    code: 'noEvents',
  });
  jest.mocked(ensureSession).mockRejectedValueOnce(new Error('login'));
  await expect(buildElectronICS(range, now)).rejects.toThrow('login');
  resetUserData();
  await expect(buildElectronICS(range, now)).rejects.toMatchObject({
    code: 'noEvents',
  });
});
