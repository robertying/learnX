// Pure builders for the calendar events, reminders and ICS entries that
// helpers/event writes. Nothing here touches the calendar or the settings
// store, so it can be tested without native modules.
import * as Calendar from 'expo-calendar';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarEvent } from 'thu-learn-lib';
import { Assignment, Course, SettingsState } from 'data/types/state';
import { removeTags } from './text';
import { ICSEvent } from './ics';
import locationMappings from '../assets/locationMappings.json';

export const courseCalendarName = 'learnX 课表';
export const assignmentCalendarReminderName = 'learnX 作业';
export const exportCalendarName = 'learnX';
export const TZ = 'Asia/Shanghai';

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

export const buildCourseEventDetails = (
  e: CalendarEvent,
  settings: SettingsState,
): EventDetails => {
  const alarms = settings.alarms;
  return {
    title: e.courseName,
    startDate: dayjs(`${e.date} ${e.startTime}`).toDate(),
    endDate: dayjs(`${e.date} ${e.endTime}`).toDate(),
    timeZone: TZ,
    location: settings.courseEventOmitLocation
      ? undefined
      : sanitizeLocation(e.location),
    notes: e.location,
    alarms: alarms.courseAlarm
      ? [
          {
            relativeOffset: -(alarms.courseAlarmOffset ?? 15),
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

/** iOS reminder for an assignment; the alarm moves the due date earlier */
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
    dueDate: alarms.assignmentReminderAlarm
      ? dueDate
          .subtract(alarms.assignmentReminderAlarmOffset ?? 24 * 60, 'minute')
          .toDate()
      : dueDate.toDate(),
    timeZone: TZ,
    completed,
    completionDate: completionDate?.toDate(),
    notes: note,
  };
};

/** Calendar event for an assignment, ending at the deadline */
export const buildAssignmentEventDetails = (
  settings: SettingsState,
  { title, note, dueDate, completed }: AssignmentEventInput,
): EventDetails => {
  const alarms = settings.alarms;
  const shouldHaveAlarm = !(
    alarms.assignmentCalendarNoAlarmIfComplete && completed
  );
  const alerts =
    shouldHaveAlarm && alarms.assignmentCalendarAlarm
      ? [
          {
            relativeOffset: -(alarms.assignmentCalendarAlarmOffset ?? 24 * 60),
            method: Calendar.AlarmMethod.DEFAULT,
          },
        ]
      : [];
  if (
    shouldHaveAlarm &&
    alarms.assignmentCalendarAlarm &&
    alarms.assignmentCalendarSecondAlarm
  ) {
    alerts.push({
      relativeOffset: -(alarms.assignmentCalendarSecondAlarmOffset ?? 30),
      method: Calendar.AlarmMethod.DEFAULT,
    });
  }

  return {
    title: (completed ? '✅ ' : '') + title,
    startDate: dueDate
      .subtract(settings.calendarEventLength ?? 30, 'minute')
      .toDate(),
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

/** The course and assignment calendars learnX created or adopted */
export const findSyncedCalendars = <T extends { id: string; title: string }>(
  calendars: T[],
  settings: Pick<SettingsState, 'courseCalendarId' | 'assignmentCalendarId'>,
) => ({
  courseCalendars: calendars.filter(
    c => c.id === settings.courseCalendarId || c.title === courseCalendarName,
  ),
  assignmentCalendars: calendars.filter(
    c =>
      c.id === settings.assignmentCalendarId ||
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
