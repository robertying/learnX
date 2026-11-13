// The classes learnX writes to the course calendar. With course calendar sync
// on, every timetable week fetched (by Today, Schedule or Sync) is written from
// today on and kept in step with the timetable and the class settings. Sync
// fetches and writes the days the user picks, beyond the weeks Today shows.
import type * as Calendar from 'expo-calendar';
import dayjs from 'dayjs';
import {
  getCalendarSync,
  setClassWeekWritten,
  setLastSynced,
} from 'data/calendarSync';
import { getCachedCourses } from 'data/queries';
import { queryClient } from 'data/queryClient';
import { queryKeys } from 'data/queryKeys';
import { calendarWeekQuery, type FailedRange } from 'data/schedule';
import { getSettings } from 'data/settings';
import { SettingsState } from 'data/types/state';
import { buildCourseEventDetails } from 'helpers/calendar/details';
import { type CalendarClass, startOfWeek } from 'helpers/schedule';
import { beijingDate } from 'helpers/serverTime';
import { hash } from 'helpers/text';
import {
  getCourseCalendar,
  hasPermission,
  requirePermission,
} from 'services/calendar/calendars';

const dayStart = (day: string) => new Date(`${day}T00:00:00+08:00`);
const addDays = (day: string, days: number) =>
  dayjs(day).add(days, 'day').format('YYYY-MM-DD');
const classDay = (c: CalendarClass) => beijingDate(Date.parse(c.start));
const later = (a: string, b: string) => (a > b ? a : b);

/** Class writes run one at a time, so two never delete each other's events. */
let queue: Promise<unknown> = Promise.resolve();
const serially = <T>(task: () => Promise<T>) => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};

/**
 * Replaces the events of the Beijing days `first` to `last` with the classes
 * on those days. Days `keep` says to keep stay as they are.
 */
const replaceDays = async (
  calendar: Calendar.ExpoCalendar,
  classes: CalendarClass[],
  first: string,
  last: string,
  settings: SettingsState,
  keep: (day: string) => boolean = () => false,
) => {
  const replaces = (day: string) => first <= day && day <= last && !keep(day);
  const courses = getCachedCourses();
  const old = await calendar.listEvents(
    dayStart(first),
    dayStart(addDays(last, 1)),
  );
  await Promise.all(
    old
      .filter(e => replaces(beijingDate(new Date(e.startDate))))
      .map(e => e.delete()),
  );
  await Promise.all(
    classes
      .filter(c => replaces(classDay(c)))
      .map(c =>
        calendar.createEvent(buildCourseEventDetails(c, settings, courses)),
      ),
  );
};

/** What a week's events are written from: its classes and the settings. */
const weekKey = (classes: CalendarClass[], settings: SettingsState) =>
  hash(
    JSON.stringify([
      settings.alarms.courseAlarm,
      settings.alarms.courseAlarmOffset,
      settings.courseEventOmitLocation,
      classes,
    ]),
  );

/** The Mondays of the weeks from `first` to `last`. */
const weeksOf = (first: string, last: string) => {
  const weeks: string[] = [];
  for (
    let week = startOfWeek(first).format('YYYY-MM-DD');
    week <= last;
    week = addDays(week, 7)
  ) {
    weeks.push(week);
  }
  return weeks;
};

const cachedWeek = (week: string, graduate: boolean) =>
  queryClient.getQueryData(calendarWeekQuery(week, graduate).queryKey);

/** Beijing days (YYYY-MM-DD) to write, and which timetable they're from. */
export interface ClassRange {
  first: string;
  last: string;
  graduate: boolean;
}

/**
 * Writes the classes of the Beijing days in `range` to the course calendar,
 * replacing what's there, except the days in `failedRanges` (weeks the
 * registrar didn't answer for). Asks for the calendar permission when it's
 * missing: only for Sync, which the user taps.
 */
export const saveClassesToCalendar = (
  classes: CalendarClass[],
  range: ClassRange,
  failedRanges: FailedRange[] = [],
) =>
  serially(async () => {
    const settings = getSettings();
    await requirePermission('calendar', { ask: true });
    const calendar = await getCourseCalendar();
    const failed = (day: string) => {
      const compact = day.replaceAll('-', '');
      return failedRanges.some(
        r => r.startDate <= compact && compact <= r.endDate,
      );
    };
    await replaceDays(
      calendar,
      classes,
      range.first,
      range.last,
      settings,
      failed,
    );
    for (const week of weeksOf(range.first, range.last)) {
      const weekClasses = cachedWeek(week, range.graduate);
      if (weekClasses && !failed(later(week, range.first))) {
        setClassWeekWritten(week, weekKey(weekClasses, settings));
      }
    }
  });

/**
 * The saved timetable weeks still under way or ahead (by Monday), of the
 * timetable the settings pick.
 */
const followedWeeks = (now: number) => {
  const { courseCalendarSync, graduate } = getSettings();
  if (!courseCalendarSync) {
    return [];
  }
  const thisWeek = startOfWeek(beijingDate(now)).format('YYYY-MM-DD');
  const kind = graduate ? 'graduate' : 'undergraduate';
  return queryClient
    .getQueriesData<CalendarClass[]>({ queryKey: queryKeys.calendarAll })
    .flatMap(([key, classes]) =>
      classes && key[2] === kind && String(key[1]) >= thisWeek
        ? [{ week: String(key[1]), classes }]
        : [],
    )
    .sort((a, b) => (a.week < b.week ? -1 : 1));
};

/**
 * With course calendar sync on, writes the saved timetable's classes from
 * today on: each week whose classes or class settings changed since it was
 * last written. Never asks for the permission and does nothing without it.
 */
export const updateSyncedClasses = (now = Date.now()) =>
  serially(async () => {
    const { writtenClassWeeks } = getCalendarSync();
    const today = beijingDate(now);
    const settings = getSettings();
    const changedWeeks = followedWeeks(now).flatMap(({ week, classes }) => {
      const key = weekKey(classes, settings);
      return writtenClassWeeks[week] !== key ? [{ week, classes, key }] : [];
    });
    if (changedWeeks.length === 0 || !(await hasPermission('calendar'))) {
      return;
    }
    const calendar = await getCourseCalendar();
    for (const { week, classes, key } of changedWeeks) {
      await replaceDays(
        calendar,
        classes,
        later(today, week),
        addDays(week, 6),
        settings,
      );
      setClassWeekWritten(week, key);
    }
    setLastSynced('courseSchedule');
  });

/**
 * The saved timetable weeks the calendar follows, for the surfaces to notice
 * when one is fetched (`services/surfaces`).
 */
export const syncedClassWeeks = (now = Date.now()) =>
  followedWeeks(now).map(({ classes }) => classes);
