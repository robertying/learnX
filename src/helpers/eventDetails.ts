// Pure builders for the calendar events, reminders and ICS entries that
// helpers/event writes. Nothing here touches the calendar or the settings
// store, so it can be tested without native modules.
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarEvent } from '@robertying/thu-learn-lib';
import { Assignment, Course, SettingsState } from 'data/types/state';
import type { CalendarSyncState } from 'data/calendarSync';
import { removeTags } from './text';
import { ICSEvent } from './ics';
import locationMappings from '../assets/locationMappings.json';
import { beijingTime } from './serverTime';

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

/** djb2, as hex; used for stable course event uids */
export function hash(text: string): string {
  let result = 5381;
  for (let i = 0; i < text.length; i++) {
    result = (result * 33 + text.charCodeAt(i)) % 0x100000000;
  }
  return result.toString(16);
}

/** What the optional calendar settings (in minutes) are until they're set. */
export const calendarDefaults = {
  courseAlarmOffset: 15,
  assignmentCalendarAlarmOffset: 24 * 60,
  assignmentCalendarSecondAlarmOffset: 30,
  calendarEventLength: 30,
};

export const buildCourseEventDetails = (
  e: CalendarEvent,
  settings: SettingsState,
): EventDetails => {
  const alarms = settings.alarms;
  return {
    title: e.courseName,
    // the registrar's dates and times are Beijing times
    startDate: new Date(beijingTime(e.date, e.startTime)),
    endDate: new Date(beijingTime(e.date, e.endTime)),
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
  startDate: Dayjs;
  dueDate: Dayjs;
  completed: boolean;
  completionDate?: Dayjs;
}

/**
 * iOS reminder for an assignment, due at the deadline, with an alert the
 * chosen time before it
 */
export const buildAssignmentReminderDetails = (
  settings: SettingsState,
  {
    title,
    note,
    startDate,
    dueDate,
    completed,
    completionDate,
  }: AssignmentEventInput,
): ReminderDetails => {
  const alarms = settings.alarms;
  return {
    title,
    startDate: startDate.toDate(),
    dueDate: dueDate.toDate(),
    // Reminders folds any alarm into the reminder's own date and time, so an
    // earlier alarm would move the deadline. The alert is at the deadline.
    alarms: alarms.assignmentReminderAlarm ? [{ relativeOffset: 0 }] : [],
    // The device's zone: Reminders labels any other zone (e.g. "GMT+8").
    timeZone: deviceTimeZone(),
    completed,
    completionDate: completionDate?.toDate(),
    notes: note,
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

/** Calendar event for an assignment, ending at the deadline */
export const buildAssignmentEventDetails = (
  settings: SettingsState,
  { title, note, dueDate, completed }: AssignmentEventInput,
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
          startDate: now,
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
