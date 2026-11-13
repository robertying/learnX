// The classes learnX writes to the course calendar. Sync writes the days the
// user picks; from then on, the synced days from today on follow the
// timetable's weeks as they're fetched and the class settings as they change.
import type * as Calendar from 'expo-calendar';
import dayjs from 'dayjs';
import {
  type ClassSyncRange,
  getCalendarSync,
  setClassSync,
  setClassWeekWritten,
} from 'data/calendarSync';
import { getCachedCourses } from 'data/queries';
import { queryClient } from 'data/queryClient';
import { calendarWeekQuery, type FailedRange } from 'data/schedule';
import { getSettings } from 'data/settings';
import { SettingsState } from 'data/types/state';
import { buildCourseEventDetails } from 'helpers/calendar/details';
import { type CalendarClass, startOfWeek } from 'helpers/schedule';
import { beijingDate } from 'helpers/serverTime';
import { hash } from 'helpers/text';
import {
  findCourseCalendar,
  getCourseCalendar,
  hasPermission,
  requirePermission,
} from 'services/calendar/calendars';

const dayStart = (day: string) => new Date(`${day}T00:00:00+08:00`);
const addDays = (day: string, days: number) =>
  dayjs(day).add(days, 'day').format('YYYY-MM-DD');
const classDay = (c: CalendarClass) => beijingDate(Date.parse(c.start));
const later = (a: string, b: string) => (a > b ? a : b);
const earlier = (a: string, b: string) => (a < b ? a : b);

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

/**
 * Writes the classes of the Beijing days in `range` to the course calendar,
 * replacing what's there, except the days in `failedRanges` (weeks the
 * registrar didn't answer for). From then on, the range follows the
 * timetable and the settings (`updateSyncedClasses`). Asks for the calendar
 * permission when it's missing: only for Sync, which the user taps.
 */
export const saveClassesToCalendar = (
  classes: CalendarClass[],
  range: ClassSyncRange,
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
    setClassSync(range);
    for (const week of weeksOf(range.first, range.last)) {
      const weekClasses = cachedWeek(week, range.graduate);
      if (weekClasses && !failed(later(week, range.first))) {
        setClassWeekWritten(week, weekKey(weekClasses, settings));
      }
    }
  });

/**
 * Brings the synced classes from today on in step with the saved timetable
 * and the class settings: a week whose classes or settings changed since it
 * was written is written again. Never asks for a permission, and does
 * nothing without one, or once the course calendar is gone.
 */
export const updateSyncedClasses = () =>
  serially(async () => {
    const { classSync: range, writtenClassWeeks } = getCalendarSync();
    const today = beijingDate(Date.now());
    if (!range || range.last < today) {
      return;
    }
    const settings = getSettings();
    const first = later(range.first, today);
    const changedWeeks = weeksOf(first, range.last).flatMap(week => {
      const classes = cachedWeek(week, range.graduate);
      const key = classes && weekKey(classes, settings);
      return classes && key && writtenClassWeeks[week] !== key
        ? [{ week, classes, key }]
        : [];
    });
    if (changedWeeks.length === 0 || !(await hasPermission('calendar'))) {
      return;
    }
    const calendar = await findCourseCalendar();
    if (!calendar) {
      return;
    }
    for (const { week, classes, key } of changedWeeks) {
      await replaceDays(
        calendar,
        classes,
        later(first, week),
        earlier(range.last, addDays(week, 6)),
        settings,
      );
      setClassWeekWritten(week, key);
    }
  });

/**
 * The saved timetable weeks the synced classes follow, for the surfaces to
 * notice when one is fetched (`services/surfaces`).
 */
export const syncedClassWeeks = (now = Date.now()) => {
  const range = getCalendarSync().classSync;
  const today = beijingDate(now);
  if (!range || range.last < today) {
    return [];
  }
  return weeksOf(later(range.first, today), range.last).map(week =>
    cachedWeek(week, range.graduate),
  );
};
