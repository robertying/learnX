import { queryOptions, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { semesterWeek } from '@robertying/thu-learn-lib';
import { coursesQuery, schoolSemesterQuery } from 'data/queries';
import { queryClient } from 'data/queryClient';
import { queryKeys } from 'data/queryKeys';
import { useLoggedIn } from 'data/auth';
import { dataSource } from 'data/source';
import { getSettings, useSettings } from 'data/settings';
import { getUserData, useUserData } from 'data/userData';
import { createLimiter } from 'helpers/limiter';
import { isNetworkError } from 'helpers/errors';
import { Course } from 'data/types/state';
import {
  CalendarClass,
  ClassSession,
  sessionsFromCalendar,
  sessionsFromCourses,
  startOfWeek,
} from 'helpers/schedule';
import { beijingDate } from 'helpers/serverTime';

const DAY = 24 * 60 * 60 * 1000;

/**
 * The registrar's calendar fails for some ranges, often for long ones and
 * now and then for no clear reason. So it's asked for one week at a time, one
 * request at a time, and a failed week only affects that week. thu-learn-lib
 * gets the registrar's ticket itself and retries a failed request once.
 */
const calendarFetches = createLimiter(1);

const fetchCalendar = async (
  start: string,
  end: string,
  graduate: boolean,
): Promise<CalendarClass[]> => {
  // A week is a single window, so a failure rejects rather than showing up
  // in failedRanges; check anyway so a failed week never counts as empty.
  const { events, failedRanges } = await dataSource.getCalendar(start, end, {
    graduate,
  });
  if (failedRanges.length > 0) {
    throw new Error(`Calendar unavailable for ${start}–${end}`);
  }
  // An event without both times can't be placed.
  return events.flatMap(e =>
    e.start && e.end
      ? [
          {
            courseName: e.courseName,
            location: e.location,
            start: e.start,
            end: e.end,
          },
        ]
      : [],
  );
};

/**
 * The classes the registrar lists for the week starting `weekStart`
 * (YYYY-MM-DD, a Monday). A failed week keeps what was last fetched for it.
 */
export const calendarWeekQuery = (weekStart: string, graduate: boolean) =>
  queryOptions({
    queryKey: queryKeys.calendar(weekStart, graduate),
    // Timetables rarely change within a day.
    staleTime: DAY / 2,
    // Offline, a retry only keeps the spinner going; the saved week shows.
    retry: (failures, err) => failures < 2 && !isNetworkError(err),
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10 * 1000),
    queryFn: () =>
      calendarFetches(() =>
        fetchCalendar(
          dayjs(weekStart).format('YYYYMMDD'),
          dayjs(weekStart).add(6, 'day').format('YYYYMMDD'),
          graduate,
        ),
      ),
  });

/** Days the registrar's calendar couldn't be fetched for (YYYYMMDD). */
export interface FailedRange {
  startDate: string;
  endDate: string;
}

/**
 * The registrar's classes from `start` to `end` (whole days), fetched week by
 * week through the same queries (and the same saved weeks) as Today and Up
 * Next, so the exported calendar and the app's timetable agree. A week that
 * fails is left out and listed in `failedRanges`; rejects only when every
 * week failed.
 */
export const fetchCalendarRange = async (
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  graduate: boolean,
  {
    fresh = false,
  }: {
    /** Asks the registrar for every week, even one fetched a moment ago. */
    fresh?: boolean;
  } = {},
): Promise<{ classes: CalendarClass[]; failedRanges: FailedRange[] }> => {
  const first = start.format('YYYY-MM-DD');
  const last = end.format('YYYY-MM-DD');
  const classes: CalendarClass[] = [];
  const failedRanges: FailedRange[] = [];
  let lastError: unknown;
  let weeks = 0;
  for (
    let week = startOfWeek(start);
    !week.isAfter(end, 'day');
    week = week.add(7, 'day')
  ) {
    weeks += 1;
    try {
      const weekClasses = await queryClient.fetchQuery({
        ...calendarWeekQuery(week.format('YYYY-MM-DD'), graduate),
        ...(fresh && { staleTime: 0 }),
      });
      classes.push(
        ...weekClasses.filter(c => {
          const day = beijingDate(Date.parse(c.start));
          return day >= first && day <= last;
        }),
      );
    } catch (error) {
      lastError = error;
      const from = week.isBefore(start, 'day') ? start : week;
      const to = week.add(6, 'day').isAfter(end, 'day')
        ? end
        : week.add(6, 'day');
      failedRanges.push({
        startDate: from.format('YYYYMMDD'),
        endDate: to.format('YYYYMMDD'),
      });
    }
  }
  if (weeks > 0 && failedRanges.length === weeks) {
    throw lastError;
  }
  return { classes, failedRanges };
};

export type ScheduleSource =
  /** The registrar's calendar, fetched now or earlier. */
  | 'calendar'
  /** Worked out from the courses: no calendar was ever fetched for the week. */
  | 'courses'
  /** Nothing to go on yet. */
  | 'none';

export interface WeekSchedule {
  /** The week's classes, earliest first, without hidden courses. */
  sessions: ClassSession[];
  source: ScheduleSource;
  /** The teaching week, when the term's first day is known. */
  week: number | null;
  /** When the calendar was last fetched (ms), 0 if never. */
  updatedAt: number;
  fetching: boolean;
  /** The latest fetch failed; what's shown is older or worked out. */
  failed: boolean;
  refetch: () => Promise<{ isError: boolean }>;
}

const noSessions: ClassSession[] = [];

/**
 * The classes of the week starting `weekStart` (YYYY-MM-DD, a Monday): the
 * registrar's calendar when it was fetched, or else worked out from the
 * courses' times and the term's first day; without hidden courses.
 */
export const weekSessions = ({
  calendar,
  courses,
  startDate,
  weekStart,
  hiddenCourses,
}: {
  calendar: CalendarClass[] | undefined;
  courses: Course[];
  /** The term's first day, as the server gives it; may be empty. */
  startDate: string;
  weekStart: string;
  hiddenCourses: string[];
}): { sessions: ClassSession[]; source: ScheduleSource } => {
  let source: ScheduleSource = 'none';
  let sessions = noSessions;
  if (calendar) {
    source = 'calendar';
    sessions = sessionsFromCalendar(calendar, courses);
  } else if (dayjs(startDate).isValid() && courses.length > 0) {
    source = 'courses';
    sessions = sessionsFromCourses(courses, startDate, weekStart);
  }
  if (hiddenCourses.length > 0) {
    sessions = sessions.filter(
      s => !s.courseId || !hiddenCourses.includes(s.courseId),
    );
  }
  return { sessions, source };
};

/**
 * The classes of the week that `date` falls in, from what's cached, for code
 * outside React (the widgets and App Intents). Nothing is fetched.
 */
export const getCachedWeekSessions = (date: dayjs.ConfigType) => {
  const weekStart = startOfWeek(date).format('YYYY-MM-DD');
  const semester = queryClient.getQueryData(schoolSemesterQuery.queryKey);
  return weekSessions({
    calendar: queryClient.getQueryData(
      calendarWeekQuery(weekStart, getSettings().graduate).queryKey,
    ),
    courses:
      (semester &&
        queryClient.getQueryData(coursesQuery(semester.id).queryKey)) ??
      [],
    startDate: semester?.startDate ?? '',
    weekStart,
    hiddenCourses: getUserData().hiddenCourses,
  });
};

/** The classes of the week that `date` falls in. */
export const useWeekSchedule = (date: dayjs.ConfigType): WeekSchedule => {
  const loggedIn = useLoggedIn();
  const graduate = useSettings(settings => settings.graduate);
  const hiddenCourses = useUserData(data => data.hiddenCourses);
  const weekStart = startOfWeek(date).format('YYYY-MM-DD');

  const semester = useQuery({ ...schoolSemesterQuery, enabled: loggedIn });
  const semesterId = semester.data?.id ?? '';
  const courses = useQuery({
    ...coursesQuery(semesterId),
    enabled: loggedIn && !!semesterId,
  });
  const calendar = useQuery({
    ...calendarWeekQuery(weekStart, graduate),
    enabled: loggedIn,
  });

  const startDate = semester.data?.startDate ?? '';
  const { sessions, source } = weekSessions({
    calendar: calendar.data,
    courses: courses.data ?? [],
    startDate,
    weekStart,
    hiddenCourses,
  });

  const refetch = async () => {
    const results = await Promise.all([
      calendar.refetch({ cancelRefetch: false }),
      semester.refetch({ cancelRefetch: false }),
    ]);
    return { isError: results[0].isError };
  };

  return {
    sessions,
    source,
    week: dayjs(startDate).isValid()
      ? semesterWeek(dayjs(startDate).format('YYYY-MM-DD'), weekStart)
      : null,
    updatedAt: calendar.dataUpdatedAt,
    fetching: calendar.isFetching,
    failed: calendar.isError,
    refetch,
  };
};
