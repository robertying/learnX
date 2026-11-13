// Pure builders for the calendar events, reminders and ICS entries that
// services/calendar/calendars writes. Nothing here touches the calendar or the
// settings store, so it can be tested without native modules.
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import dayjs, { Dayjs } from 'dayjs';
import { type CalendarClass, matchCourse } from 'helpers/schedule';
import { getTargetUrl } from 'helpers/openTarget';
import { Assignment, Course, SettingsState } from 'data/types/state';
import type { CalendarSyncState } from 'data/calendarSync';
import { hash, removeTags } from 'helpers/text';
import { ICSEvent } from './ics';
import locationMappings from '../../assets/locationMappings.json';
import { t } from 'helpers/i18n';

/** Settings › Calendar's name: Reminders sync is only on iOS, iPadOS and Mac. */
export const calendarSettingsTitle = () =>
  Platform.OS === 'ios'
    ? t('calendarsAndReminders')
    : t('setupCalendarSection');

// Calendars are found by name, so translating these would orphan the ones
// users already have.
/* oxlint-disable learnx/no-han-outside-translations */
export const courseCalendarName = 'learnX 课表';
export const assignmentCalendarReminderName = 'learnX 作业';
/* oxlint-enable learnx/no-han-outside-translations */
export const exportCalendarName = 'learnX';
export const TZ = 'Asia/Shanghai';

const deviceTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || TZ;

type EventDetails = Omit<
  Partial<Calendar.ExpoCalendarEvent>,
  'id' | 'organizer'
>;
type ReminderDetails = Omit<
  Partial<Calendar.ExpoCalendarReminder>,
  'id' | 'calendarId'
>;

/** Prefixes the building's full name from locationMappings, if known */
export function sanitizeLocation(location: string): string {
  location = location.trim();

  // Match building (Chinese chars / letters) + unit
  const match = location.match(/^([一-龥A-Za-z]+)(.*)$/);
  if (!match) return location;

  const rawBuilding = match[1];
  const fullName = (locationMappings as Record<string, string | undefined>)[
    rawBuilding
  ];
  if (fullName) {
    return fullName + ' ' + location;
  }

  return location;
}

/** What the optional calendar settings (in minutes) are until they're set. */
export const calendarDefaults = {
  courseAlarmOffset: 15,
  assignmentReminderAlarmOffset: 24 * 60,
  assignmentCalendarAlarmOffset: 24 * 60,
  assignmentCalendarSecondAlarmOffset: 30,
  calendarEventLength: 30,
};

/**
 * A class's event. Its link opens the course in learnX, or Today when the
 * class matches none of `courses`.
 */
export const buildCourseEventDetails = (
  e: CalendarClass,
  settings: SettingsState,
  courses: Course[] = [],
): EventDetails => {
  const alarms = settings.alarms;
  const course = matchCourse(e.courseName, courses);
  return {
    title: e.courseName,
    url: getTargetUrl(
      course ? { type: 'course', id: course.id } : { type: 'today' },
    ),
    startDate: new Date(e.start),
    endDate: new Date(e.end),
    timeZone: TZ,
    location: settings.courseEventOmitLocation
      ? undefined
      : sanitizeLocation(e.location),
    notes: e.location,
    alarms: alarms.courseAlarm
      ? [
          {
            relativeOffset: -(
              alarms.courseAlarmOffset ?? calendarDefaults.courseAlarmOffset
            ),
          },
        ]
      : [],
  };
};

export interface AssignmentEventInput {
  assignmentId: string;
  title: string;
  note: string;
  dueDate: Dayjs;
  completed: boolean;
  completionDate?: Dayjs;
}

/**
 * iOS reminder for an assignment, due at the deadline. With the alert on, it
 * alerts then and the chosen minutes before. Reminders lists a reminder at its
 * earliest alert (apps can't set Early Reminder), while the due date stays
 * the deadline. Its link, at the end of its notes, opens the assignment in
 * learnX.
 */
export const buildAssignmentReminderDetails = (
  settings: SettingsState,
  {
    assignmentId,
    title,
    note,
    dueDate,
    completed,
    completionDate,
  }: AssignmentEventInput,
): ReminderDetails => {
  const alarms = settings.alarms;
  const before =
    alarms.assignmentReminderAlarmOffset ??
    calendarDefaults.assignmentReminderAlarmOffset;
  const url = getTargetUrl({ type: 'assignment', id: assignmentId });
  return {
    title,
    // No start date, so the alerts count from the due date.
    dueDate: dueDate.toDate(),
    alarms: alarms.assignmentReminderAlarm
      ? [
          { relativeOffset: 0 },
          ...(before > 0 ? [{ relativeOffset: -before }] : []),
        ]
      : [],
    // The device's zone: Reminders labels any other zone (e.g. "GMT+8").
    timeZone: deviceTimeZone(),
    completed,
    completionDate: completionDate?.toDate(),
    // Reminders doesn't show the url field that apps can set, so the link
    // also ends the notes, where it can be tapped.
    notes: [note, url].filter(Boolean).join('\n\n'),
    url,
  };
};

/**
 * An alert `minutes` before the deadline, which is the event's end. Alerts
 * count from the event's start, so the event's length is added back. Android
 * has no alerts after the start, so one closer to the deadline than the
 * event is long goes off at the start.
 */
export const alertBeforeDeadline = (minutes: number, eventLength: number) => ({
  relativeOffset:
    Platform.OS === 'android'
      ? Math.min(eventLength - minutes, 0)
      : eventLength - minutes,
  method: Calendar.AlarmMethod.DEFAULT,
});

/**
 * Calendar event for an assignment, ending at the deadline. Its link opens
 * the assignment in learnX.
 */
export const buildAssignmentEventDetails = (
  settings: SettingsState,
  { assignmentId, title, note, dueDate, completed }: AssignmentEventInput,
): EventDetails => {
  const alarms = settings.alarms;
  const eventLength =
    settings.calendarEventLength ?? calendarDefaults.calendarEventLength;
  const shouldHaveAlarm = !(
    alarms.assignmentCalendarNoAlarmIfComplete && completed
  );
  const alerts =
    shouldHaveAlarm && alarms.assignmentCalendarAlarm
      ? [
          alertBeforeDeadline(
            alarms.assignmentCalendarAlarmOffset ??
              calendarDefaults.assignmentCalendarAlarmOffset,
            eventLength,
          ),
        ]
      : [];
  if (
    shouldHaveAlarm &&
    alarms.assignmentCalendarAlarm &&
    alarms.assignmentCalendarSecondAlarm
  ) {
    alerts.push(
      alertBeforeDeadline(
        alarms.assignmentCalendarSecondAlarmOffset ??
          calendarDefaults.assignmentCalendarSecondAlarmOffset,
        eventLength,
      ),
    );
  }

  return {
    title: (completed ? '✅ ' : '') + title,
    startDate: dueDate.subtract(eventLength, 'minute').toDate(),
    endDate: dueDate.toDate(),
    timeZone: TZ,
    notes: note,
    url: getTargetUrl({ type: 'assignment', id: assignmentId }),
    alarms: alerts,
  };
};

/**
 * Assignments still open at `now` whose course is known, as event inputs.
 * The title gets the course name appended.
 */
export const buildAssignmentEventInputs = (
  assignments: Assignment[],
  courses: Course[],
  now: Dayjs = dayjs(),
): AssignmentEventInput[] =>
  assignments
    .filter(item => dayjs(item.deadline).isAfter(now))
    .flatMap(assignment => {
      const course = courses.find(value => value.id === assignment.courseId);
      if (!course) {
        return [];
      }
      return [
        {
          assignmentId: assignment.id,
          title: assignment.title + ' - ' + course.name,
          note: removeTags(assignment.description),
          dueDate: dayjs(assignment.deadline),
          completed: assignment.submitted,
          completionDate: assignment.submitTime
            ? dayjs(assignment.submitTime)
            : undefined,
        },
      ];
    });

/** Whether learnX created or adopted this calendar or reminder list. */
export const isSyncedCalendar = (
  calendar: { id: string; title: string },
  synced: Pick<
    CalendarSyncState,
    'courseCalendarId' | 'assignmentCalendarId' | 'assignmentReminderId'
  >,
) =>
  [
    synced.courseCalendarId,
    synced.assignmentCalendarId,
    synced.assignmentReminderId,
  ].some(id => !!id && id === calendar.id) ||
  calendar.title === courseCalendarName ||
  calendar.title === assignmentCalendarReminderName;

/** The course and assignment calendars learnX created or adopted */
export const findSyncedCalendars = <T extends { id: string; title: string }>(
  calendars: T[],
  synced: Pick<CalendarSyncState, 'courseCalendarId' | 'assignmentCalendarId'>,
) => ({
  courseCalendars: calendars.filter(
    c => c.id === synced.courseCalendarId || c.title === courseCalendarName,
  ),
  assignmentCalendars: calendars.filter(
    c =>
      c.id === synced.assignmentCalendarId ||
      c.title === assignmentCalendarReminderName,
  ),
});

export const toICSEvent = (
  e: Pick<
    Calendar.ExpoCalendarEvent,
    | 'id'
    | 'title'
    | 'startDate'
    | 'endDate'
    | 'allDay'
    | 'location'
    | 'notes'
    | 'url'
    | 'alarms'
  >,
  isCourse: boolean,
): ICSEvent => {
  const start = new Date(e.startDate);
  return {
    // Course events are recreated on every sync so their ids are not stable
    uid: isCourse
      ? `course-${start.getTime()}-${hash(e.title)}@learnx`
      : `${e.id}@learnx`,
    title: e.title,
    startDate: start,
    endDate: new Date(e.endDate),
    allDay: e.allDay,
    location: e.location,
    notes: e.notes,
    url: e.url,
    alarmOffsets: (e.alarms ?? [])
      .map(alarm => alarm.relativeOffset)
      .filter(offset => typeof offset === 'number'),
  };
};

/** Drops repeated uids (first one wins) and sorts by start date */
export const dedupeAndSortICSEvents = (events: ICSEvent[]) => {
  const uids = new Set<string>();
  return events
    .filter(e => {
      if (uids.has(e.uid)) {
        return false;
      }
      uids.add(e.uid);
      return true;
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
};
