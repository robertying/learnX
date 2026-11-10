import { createElement, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { FailReason } from '@robertying/thu-learn-lib';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuthStore } from 'data/auth';
import { coursesQuery, schoolSemesterQuery } from 'data/queries';
import { clearQueryCache, queryClient } from 'data/queryClient';
import {
  calendarWeekQuery,
  getCachedWeekSessions,
  useWeekSchedule,
  weekSessions,
} from 'data/schedule';
import { resetSettings, setSetting } from 'data/settings';
import { dataSource } from 'data/source';
import type { Course } from 'data/types/state';
import { resetUserData, setCourseHidden } from 'data/userData';
import type { CalendarClass } from 'helpers/schedule';

jest.mock('data/source', () => ({
  dataSource: { getCalendar: jest.fn(), getCurrentSemester: jest.fn() },
}));

const getCalendar = jest.mocked(dataSource.getCalendar);

const course = (id: string, name: string, times: string[]): Course => ({
  id,
  name,
  chineseName: name,
  englishName: name,
  teacherName: '',
  teacherNumber: '',
  courseNumber: '',
  courseIndex: 0,
  timeAndLocation: times,
  semesterId: '2026-2027-1',
});

const courses = [
  course('calc', '微积分', ['星期一第2节(全周)，六教6A414']),
  course('phys', '物理', ['星期三第3节(全周)，四教4101']),
];

// Mondays: the term's first day and its third week.
const termStart = '2026-09-14';
const week3 = '2026-09-28';

const calendar: CalendarClass[] = [
  {
    courseName: '物理',
    location: '四教4102',
    date: '2026-09-30',
    startTime: '13:30',
    endTime: '15:05',
  },
];

describe('weekSessions', () => {
  const base = {
    courses,
    startDate: termStart,
    weekStart: week3,
    hiddenCourses: [],
  };

  it("prefers the registrar's calendar over the courses' times", () => {
    const { sessions, source } = weekSessions({ ...base, calendar });
    expect(source).toBe('calendar');
    expect(sessions).toEqual([
      expect.objectContaining({ courseId: 'phys', location: '四教4102' }),
    ]);
  });

  it("works the week out from the courses' times without a calendar", () => {
    const { sessions, source } = weekSessions({ ...base, calendar: undefined });
    expect(source).toBe('courses');
    expect(sessions.map(s => s.courseId)).toEqual(['calc', 'phys']);
  });

  it('has nothing to go on without courses or the first day', () => {
    expect(weekSessions({ ...base, calendar: undefined, courses: [] })).toEqual(
      { sessions: [], source: 'none' },
    );
    expect(
      weekSessions({ ...base, calendar: undefined, startDate: '' }),
    ).toEqual({ sessions: [], source: 'none' });
  });

  it('leaves hidden courses out, keeping classes of unknown courses', () => {
    const unmatched = { ...calendar[0], courseName: 'Seminar' };
    const { sessions } = weekSessions({
      ...base,
      calendar: [...calendar, unmatched],
      hiddenCourses: ['phys'],
    });
    expect(sessions).toEqual([
      expect.objectContaining({ courseName: 'Seminar', courseId: undefined }),
    ]);
  });
});

describe('calendarWeekQuery', () => {
  beforeEach(() => {
    clearQueryCache();
  });

  it('asks for the Monday-to-Sunday range and keeps the class fields', async () => {
    getCalendar.mockResolvedValue({
      events: calendar.map(c => ({ ...c, extra: 'dropped' })),
      failedRanges: [],
    } as never);
    const classes = await queryClient.fetchQuery(
      calendarWeekQuery(week3, true),
    );
    expect(getCalendar).toHaveBeenCalledWith('20260928', '20261004', {
      graduate: true,
    });
    expect(classes).toEqual(calendar);
  });

  it('fails a week the registrar could not list, never counting it as empty', async () => {
    getCalendar.mockResolvedValue({
      events: [],
      failedRanges: [['20260928', '20261004']],
    } as never);
    await expect(
      queryClient.fetchQuery({ ...calendarWeekQuery(week3, false), retry: 0 }),
    ).rejects.toThrow('Calendar unavailable for 20260928–20261004');
  });

  it('retries once, and not while offline', () => {
    const { retry, retryDelay } = calendarWeekQuery(week3, false);
    const retryFn = retry as (failures: number, error: unknown) => boolean;
    const delay = retryDelay as (attempt: number) => number;
    expect(retryFn(0, new Error('500'))).toBe(true);
    expect(retryFn(1, new Error('500'))).toBe(true);
    expect(retryFn(2, new Error('500'))).toBe(false);
    expect(
      retryFn(0, {
        reason: FailReason.NETWORK_ERROR,
        extra: new TypeError('Network request failed'),
      }),
    ).toBe(false);
    expect([0, 1, 3, 10].map(delay)).toEqual([1000, 2000, 8000, 10000]);
  });

  it('keys weeks by graduate or undergraduate', () => {
    expect(calendarWeekQuery(week3, true).queryKey).toEqual([
      'calendar',
      week3,
      'graduate',
    ]);
    expect(calendarWeekQuery(week3, false).queryKey).toEqual([
      'calendar',
      week3,
      'undergraduate',
    ]);
  });
});

describe('getCachedWeekSessions', () => {
  beforeEach(() => {
    clearQueryCache();
    resetSettings();
    resetUserData();
  });

  it('has nothing before anything is cached', () => {
    expect(getCachedWeekSessions('2026-09-30')).toEqual({
      sessions: [],
      source: 'none',
    });
  });

  it('works from the cached courses, then the cached calendar of the setting', () => {
    queryClient.setQueryData(schoolSemesterQuery.queryKey, {
      id: '2026-2027-1',
      startDate: termStart,
      endDate: '2027-01-17',
    });
    queryClient.setQueryData(coursesQuery('2026-2027-1').queryKey, courses);
    // Any day of the week finds its Monday.
    expect(getCachedWeekSessions('2026-10-03').source).toBe('courses');

    queryClient.setQueryData(calendarWeekQuery(week3, true).queryKey, calendar);
    expect(getCachedWeekSessions('2026-10-03').source).toBe('courses');
    setSetting('graduate', true);
    expect(getCachedWeekSessions('2026-10-03').source).toBe('calendar');

    setCourseHidden('phys', true);
    expect(getCachedWeekSessions('2026-10-03').sessions).toEqual([]);
  });
});

describe('useWeekSchedule', () => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const semester = {
    id: '2026-2027-1',
    startDate: termStart,
    endDate: '2027-01-17',
  };

  beforeEach(() => {
    clearQueryCache();
    resetSettings();
    resetUserData();
  });
  afterEach(() => useAuthStore.setState({ loggedIn: false }));

  it('asks for nothing while logged out, and has no teaching week', async () => {
    const { result } = await renderHook(() => useWeekSchedule('2026-09-30'), {
      wrapper,
    });
    expect(result.current).toMatchObject({
      sessions: [],
      source: 'none',
      week: null,
      fetching: false,
      failed: false,
    });
    expect(getCalendar).not.toHaveBeenCalled();
  });

  it("shows the week's calendar with its teaching week, and refreshes it", async () => {
    useAuthStore.setState({ loggedIn: true });
    queryClient.setQueryData(schoolSemesterQuery.queryKey, semester);
    queryClient.setQueryData(coursesQuery(semester.id).queryKey, courses);
    getCalendar.mockResolvedValue({
      events: calendar,
      failedRanges: [],
    } as never);
    jest
      .mocked(dataSource.getCurrentSemester)
      .mockResolvedValue(semester as never);

    const { result } = await renderHook(() => useWeekSchedule('2026-09-30'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.source).toBe('calendar'));
    expect(result.current.week).toBe(3);
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.updatedAt).toBeGreaterThan(0);

    let refreshed: { isError: boolean } | undefined;
    await act(async () => {
      refreshed = await result.current.refetch();
    });
    expect(refreshed).toEqual({ isError: false });
    expect(getCalendar).toHaveBeenCalledTimes(2);
  });

  it('works the week out from the courses when the calendar fails', async () => {
    useAuthStore.setState({ loggedIn: true });
    queryClient.setQueryData(schoolSemesterQuery.queryKey, semester);
    queryClient.setQueryData(coursesQuery(semester.id).queryKey, courses);
    getCalendar.mockRejectedValue(new Error('500'));
    jest.useFakeTimers();

    const { result } = await renderHook(() => useWeekSchedule('2026-09-30'), {
      wrapper,
    });
    // Past its retries
    await act(() => jest.advanceTimersByTimeAsync(10 * 1000));
    jest.useRealTimers();
    expect(result.current.failed).toBe(true);
    expect(result.current.source).toBe('courses');
    expect(result.current.sessions).toHaveLength(2);
  });
});
