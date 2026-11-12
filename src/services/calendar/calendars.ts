import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import dayjs, { Dayjs } from 'dayjs';
import type { CalendarClass } from 'helpers/schedule';
import type { FailedRange } from 'data/schedule';
import { getSettings } from 'data/settings';
import {
  type AssignmentEventType,
  clearEventIds,
  getAssignmentEventIds,
  getCalendarSync,
  removeEventIdForAssignment,
  resetCalendarSync,
  setEventIdForAssignment,
  setSyncedCalendarId,
  type SyncedCalendar,
} from 'data/calendarSync';
import { getCachedCourses } from 'data/queries';
import { Assignment, SettingsState } from 'data/types/state';
import Colors from 'constants/Colors';
import {
  AssignmentEventInput,
  assignmentCalendarReminderName,
  buildAssignmentEventDetails,
  buildAssignmentEventInputs,
  buildAssignmentReminderDetails,
  buildCourseEventDetails,
  courseCalendarName,
  dedupeAndSortICSEvents,
  isSyncedCalendar,
  exportCalendarName,
  findSyncedCalendars,
  toICSEvent,
} from 'helpers/calendar/details';
import { CalendarError } from 'services/calendar/errors';
import { buildICS } from 'helpers/calendar/ics';

export const getAndRequestPermission = async (
  type: 'calendar' | 'reminder',
) => {
  if (type === 'calendar') {
    const { status } = await Calendar.getCalendarPermissions();
    if (status === 'granted') {
      return true;
    }
    const { status: newStatus } = await Calendar.requestCalendarPermissions();
    return newStatus === 'granted';
  } else {
    const { status } = await Calendar.getRemindersPermissions();
    if (status === 'granted') {
      return true;
    }
    const { status: newStatus } = await Calendar.requestRemindersPermissions();
    return newStatus === 'granted';
  }
};

/** Whether learnX may use the calendars or Reminders now, without asking. */
export const hasPermission = async (type: 'calendar' | 'reminder') => {
  const { status } =
    type === 'calendar'
      ? await Calendar.getCalendarPermissions()
      : await Calendar.getRemindersPermissions();
  return status === 'granted';
};

/**
 * Throws without the permission. `ask` asks for it first: only for what the
 * user just did, never for a sync the app starts by itself.
 */
const requirePermission = async (
  type: 'calendar' | 'reminder',
  { ask = true }: { ask?: boolean } = {},
) => {
  if (!(await (ask ? getAndRequestPermission(type) : hasPermission(type)))) {
    throw new CalendarError(
      type === 'calendar' ? 'calendarPermission' : 'reminderPermission',
    );
  }
};

const getDefaultCalendarSource = async (entityType: Calendar.EntityTypes) => {
  const calendars = await Calendar.getCalendars(entityType);

  const iCloudCalendar = calendars.find(c => c.source.name === 'iCloud');
  if (iCloudCalendar) {
    return iCloudCalendar.source;
  }

  const localCalendar = calendars.find(
    c => c.source.type === Calendar.SourceType.LOCAL,
  );
  if (localCalendar) {
    return localCalendar.source;
  } else {
    throw new CalendarError('noSource');
  }
};

const androidCalendarSource = {
  name: 'learnX',
  isLocalAccount: true,
} as Calendar.Source;

/**
 * Returns the stored calendar if it still exists, else adopts one with the
 * same title, else creates it. The id is saved in `data/calendarSync`.
 */
const getOrCreateCalendar = async ({
  setting,
  title,
  name,
  entityType,
  onCreate,
}: {
  setting: SyncedCalendar;
  title: string;
  name: string;
  entityType: Calendar.EntityTypes;
  /** Runs before a new calendar is created */
  onCreate?: () => void;
}): Promise<Calendar.ExpoCalendar> => {
  // Listed by type, since EventKit guards each with its own permission:
  // Reminders sync works with only Reminders access.
  const calendars = await Calendar.getCalendars(entityType);

  const storedId = getCalendarSync()[setting];
  const storedCalendar = storedId
    ? calendars.find(value => value.id === storedId)
    : undefined;
  if (storedCalendar) {
    return storedCalendar;
  }

  const existingCalendar = calendars.find(value => value.title === title);
  if (existingCalendar) {
    setSyncedCalendarId(setting, existingCalendar.id);
    return existingCalendar;
  }

  onCreate?.();

  const defaultCalendarSource =
    Platform.OS === 'ios' || entityType === Calendar.EntityTypes.REMINDER
      ? await getDefaultCalendarSource(entityType)
      : androidCalendarSource;

  const newCalendar = await Calendar.createCalendar({
    title,
    color: Colors.plainTheme,
    entityType,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name,
    ownerAccount: 'learnX',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  if (newCalendar.id) {
    setSyncedCalendarId(setting, newCalendar.id);
  }
  return newCalendar;
};

export const getCourseCalendar = () =>
  getOrCreateCalendar({
    setting: 'courseCalendarId',
    title: courseCalendarName,
    name: courseCalendarName,
    entityType: Calendar.EntityTypes.EVENT,
  });

/**
 * Replaces the synced classes in the range with `events`. Classes in
 * `failedRanges` (weeks the registrar didn't answer for) stay as they were.
 */
export const saveCoursesToCalendar = async (
  events: CalendarClass[],
  startDate: Dayjs,
  endDate: Dayjs,
  failedRanges: FailedRange[] = [],
) => {
  const settings = getSettings();

  await requirePermission('calendar');

  const calendar = await getCourseCalendar();

  const oldEvents = await calendar.listEvents(
    startDate.toDate(),
    endDate.toDate(),
  );

  const isInFailedRange = (date: string | Date) => {
    const day = dayjs(date).format('YYYYMMDD');
    return failedRanges.some(
      range => range.startDate <= day && day <= range.endDate,
    );
  };
  await Promise.all(
    oldEvents
      .filter(e => !isInFailedRange(e.startDate))
      .map(async e => await e.delete()),
  );

  await Promise.all(
    events.map(
      async e =>
        await calendar.createEvent(buildCourseEventDetails(e, settings)),
    ),
  );
};

export const getAssignmentCalendar = () =>
  getOrCreateCalendar({
    setting: 'assignmentCalendarId',
    title: assignmentCalendarReminderName,
    // Not a typo: this calendar has always used the course calendar's name
    name: courseCalendarName,
    entityType: Calendar.EntityTypes.EVENT,
    onCreate: () => clearEventIds('calendar'),
  });

export const getAssignmentReminder = () =>
  getOrCreateCalendar({
    setting: 'assignmentReminderId',
    title: assignmentCalendarReminderName,
    name: assignmentCalendarReminderName,
    entityType: Calendar.EntityTypes.REMINDER,
    onCreate: () => clearEventIds('reminder'),
  });

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * How long before its deadline a reminder may be due: its alert moves its date
 * that far ahead (`buildAssignmentReminderDetails`).
 */
const REMINDER_LEAD_MS = 30 * DAY_MS;

const withoutDoneMark = (title: string | undefined) =>
  title?.replace(/^✅ /, '');

const time = (date: Date | string | undefined) =>
  date === undefined ? NaN : new Date(date).getTime();

/**
 * Takes over entries already in `calendar` for assignments with no saved
 * event or reminder, so a sync whose saved ids are gone (a reinstall, which
 * keeps the calendar and adopts it by its title) updates them instead of
 * adding each assignment a second time. Nothing in an entry names its
 * assignment, so one matches by title (with or without the submitted mark)
 * and deadline: an event ends at it, a reminder is due at or before it.
 */
const adoptExistingEntries = async (
  type: AssignmentEventType,
  calendar: Calendar.ExpoCalendar,
  inputs: AssignmentEventInput[],
) => {
  const synced = getAssignmentEventIds(type);
  const missing = inputs.filter(input => !synced[input.assignmentId]);
  if (missing.length === 0) {
    return;
  }
  const isReminder = Platform.OS === 'ios' && type === 'reminder';
  const deadlines = missing.map(input => input.dueDate.valueOf());
  let entries: { id: string; title?: string; due: number }[];
  try {
    entries = isReminder
      ? (await calendar.listReminders()).flatMap(r =>
          r.id ? [{ id: r.id, title: r.title, due: time(r.dueDate) }] : [],
        )
      : (
          await calendar.listEvents(
            new Date(Math.min(...deadlines) - DAY_MS),
            new Date(Math.max(...deadlines) + DAY_MS),
          )
        ).map(e => ({ id: e.id, title: e.title, due: time(e.endDate) }));
  } catch {
    return;
  }
  const taken = new Set(Object.values(synced));
  for (const input of missing) {
    const deadline = input.dueDate.valueOf();
    const match = entries.find(
      entry =>
        !taken.has(entry.id) &&
        withoutDoneMark(entry.title) === input.title &&
        (isReminder
          ? entry.due <= deadline && entry.due >= deadline - REMINDER_LEAD_MS
          : entry.due === deadline),
    );
    if (match) {
      taken.add(match.id);
      setEventIdForAssignment(type, input.assignmentId, match.id);
    }
  }
};

export const saveAssignmentEvent = async (
  type: AssignmentEventType,
  settings: SettingsState,
  calendar: Calendar.ExpoCalendar,
  input: AssignmentEventInput,
) => {
  const { assignmentId } = input;
  const syncedAssignments = getAssignmentEventIds(type);

  if (Platform.OS === 'ios' && type === 'reminder') {
    const details = buildAssignmentReminderDetails(settings, input);
    if (
      syncedAssignments &&
      Object.keys(syncedAssignments).includes(assignmentId)
    ) {
      try {
        const reminder = await Calendar.ExpoCalendarReminder.get(
          syncedAssignments[assignmentId],
        );
        await reminder.update(details);
      } catch {
        removeEventIdForAssignment('reminder', assignmentId);
      }
    } else {
      const reminder = await calendar.createReminder(details);
      setEventIdForAssignment('reminder', assignmentId, reminder.id!);
    }
  } else {
    const details = buildAssignmentEventDetails(settings, input);
    if (
      syncedAssignments &&
      Object.keys(syncedAssignments).includes(assignmentId)
    ) {
      try {
        const event = await Calendar.ExpoCalendarEvent.get(
          syncedAssignments[assignmentId],
        );
        await event.update(details);
      } catch {
        removeEventIdForAssignment('calendar', assignmentId);
      }
    } else {
      const event = await calendar.createEvent(details);
      setEventIdForAssignment('calendar', assignmentId, event.id);
    }
  }
};

/**
 * Deletes the synced events or reminders of these assignments (archived or
 * hidden since) and forgets them. One that's already gone is just forgotten.
 */
const removeAssignmentEvents = async (
  type: AssignmentEventType,
  ids: string[],
) => {
  const synced = getAssignmentEventIds(type);
  const isReminder = Platform.OS === 'ios' && type === 'reminder';
  await Promise.all(
    ids
      .filter(id => synced[id])
      .map(async id => {
        try {
          const item = isReminder
            ? await Calendar.ExpoCalendarReminder.get(synced[id])
            : await Calendar.ExpoCalendarEvent.get(synced[id]);
          await item.delete();
        } catch {}
        removeEventIdForAssignment(type, id);
      }),
  );
};

/**
 * Writes `assignments` to the calendar or reminders, and deletes the entries
 * of `removed` (assignments archived or hidden since they were written).
 * `ask` asks for the permission when it's missing; see `requirePermission`.
 */
export const saveAssignmentsToReminderOrCalendar = async (
  type: AssignmentEventType,
  assignments: Assignment[],
  removed: string[] = [],
  { ask = true }: { ask?: boolean } = {},
) => {
  const settings = getSettings();

  if (Platform.OS === 'ios' && type === 'reminder') {
    await requirePermission('reminder', { ask });
  } else {
    await requirePermission('calendar', { ask });
  }

  const calendar =
    Platform.OS === 'ios' && type === 'reminder'
      ? await getAssignmentReminder()
      : await getAssignmentCalendar();

  const inputs = buildAssignmentEventInputs(assignments, getCachedCourses());
  await adoptExistingEntries(type, calendar, inputs);

  await Promise.all(
    inputs.map(
      async input => await saveAssignmentEvent(type, settings, calendar, input),
    ),
  );
  await removeAssignmentEvents(type, removed);
};

export const removeCalendars = async () => {
  await requirePermission('calendar');

  if (Platform.OS === 'ios') {
    await requirePermission('reminder');
  }

  const calendars = await Calendar.getCalendars();
  const reminders =
    Platform.OS === 'ios'
      ? await Calendar.getCalendars(Calendar.EntityTypes.REMINDER)
      : [];

  // Only the ones learnX created or adopted, not every title with learnX.
  const synced = getCalendarSync();
  const existingCalendars = [...calendars, ...reminders].filter(c =>
    isSyncedCalendar(c, synced),
  );

  await Promise.all(
    existingCalendars.map(async c => {
      await c.delete().catch(() => {});
    }),
  );

  resetCalendarSync();
};

export const exportSyncedCalendarsToICS = async () => {
  await requirePermission('calendar');

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const { courseCalendars, assignmentCalendars } = findSyncedCalendars(
    calendars,
    getCalendarSync(),
  );

  const startDate = dayjs().subtract(1, 'year').toDate();
  const endDate = dayjs().add(1, 'year').toDate();

  const events = (
    await Promise.all(
      [...courseCalendars, ...assignmentCalendars].map(async calendar => {
        const isCourse = courseCalendars.includes(calendar);
        return (await calendar.listEvents(startDate, endDate)).map(e =>
          toICSEvent(e, isCourse),
        );
      }),
    )
  ).flat();

  if (events.length === 0) {
    throw new CalendarError('noEvents');
  }

  return buildICS(exportCalendarName, dedupeAndSortICSEvents(events));
};
