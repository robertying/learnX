import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import dayjs from 'dayjs';
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
import { brandColors } from 'theme';
import {
  AssignmentEventInput,
  assignmentCalendarReminderName,
  buildAssignmentEventDetails,
  buildAssignmentEventInputs,
  buildAssignmentReminderDetails,
  courseCalendarName,
  dedupeAndSortICSEvents,
  isSyncedCalendar,
  exportCalendarName,
  findSyncedCalendars,
  toICSEvent,
} from 'helpers/calendar/details';
import { CalendarError } from 'services/calendar/errors';
import { buildICS } from 'helpers/calendar/ics';

const permissions = {
  calendar: {
    get: Calendar.getCalendarPermissions,
    request: Calendar.requestCalendarPermissions,
    error: 'calendarPermission',
  },
  reminder: {
    get: Calendar.getRemindersPermissions,
    request: Calendar.requestRemindersPermissions,
    error: 'reminderPermission',
  },
} as const;

/** Whether learnX may use the calendars or Reminders, asking if it may not. */
export const getAndRequestPermission = async (type: 'calendar' | 'reminder') =>
  (await hasPermission(type)) ||
  (await permissions[type].request()).status === 'granted';

/** Whether learnX may use the calendars or Reminders now, without asking. */
export const hasPermission = async (type: 'calendar' | 'reminder') =>
  (await permissions[type].get()).status === 'granted';

/**
 * Throws without the permission. `ask` asks for it first: only for what the
 * user just did, never for a sync the app starts by itself.
 */
export const requirePermission = async (
  type: 'calendar' | 'reminder',
  { ask }: { ask: boolean },
) => {
  if (!(await (ask ? getAndRequestPermission(type) : hasPermission(type)))) {
    throw new CalendarError(permissions[type].error);
  }
};

/** Reminders on iOS, iPadOS and Mac; Android writes reminders as events. */
const isReminderList = (type: AssignmentEventType) =>
  Platform.OS === 'ios' && type === 'reminder';

/**
 * Throws without the access assignment sync of `type` needs: Reminders for
 * reminders on Apple platforms, the calendars otherwise. `ask` as in
 * `requirePermission`.
 */
export const requireAssignmentAccess = (
  type: AssignmentEventType,
  { ask }: { ask: boolean },
) => requirePermission(isReminderList(type) ? 'reminder' : 'calendar', { ask });

/**
 * Where a new calendar or list goes: the account of the user's default
 * calendar for events, else iCloud, else the device.
 */
const getDefaultCalendarSource = async (entityType: Calendar.EntityTypes) => {
  if (entityType === Calendar.EntityTypes.EVENT) {
    try {
      const source = Calendar.getDefaultCalendarSync().source;
      if (source.id) {
        return source;
      }
    } catch {}
  }
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

/** A calendar or list learnX keeps its entries in. */
interface CalendarSpec {
  setting: SyncedCalendar;
  title: string;
  name: string;
  entityType: Calendar.EntityTypes;
  /** Runs before a new calendar is created */
  onCreate?: () => void;
}

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
}: CalendarSpec): Promise<Calendar.ExpoCalendar> =>
  (await findCalendar(setting, title, entityType)) ??
  createCalendar({ setting, title, name, entityType, onCreate });

/**
 * The stored calendar if it still exists, else one with the same title (whose
 * id is then saved in `data/calendarSync`), else undefined.
 */
const findCalendar = async (
  setting: SyncedCalendar,
  title: string,
  entityType: Calendar.EntityTypes,
) => {
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
  }
  return existingCalendar;
};

const createCalendar = async ({
  setting,
  title,
  name,
  entityType,
  onCreate,
}: CalendarSpec) => {
  onCreate?.();

  const defaultCalendarSource =
    Platform.OS === 'ios' || entityType === Calendar.EntityTypes.REMINDER
      ? await getDefaultCalendarSource(entityType)
      : androidCalendarSource;

  const newCalendar = await Calendar.createCalendar({
    title,
    color: brandColors.light,
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

/** The course calendar if there is one; never creates it. */
export const findCourseCalendar = () =>
  findCalendar(
    'courseCalendarId',
    courseCalendarName,
    Calendar.EntityTypes.EVENT,
  );

export const getCourseCalendar = () =>
  getOrCreateCalendar({
    setting: 'courseCalendarId',
    title: courseCalendarName,
    name: courseCalendarName,
    entityType: Calendar.EntityTypes.EVENT,
  });

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
  const isReminder = isReminderList(type);
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

/** The synced event or reminder with this id; throws when it's gone. */
const getEntry = (type: AssignmentEventType, id: string) =>
  isReminderList(type)
    ? Calendar.ExpoCalendarReminder.get(id)
    : Calendar.ExpoCalendarEvent.get(id);

/**
 * Updates the assignment's event or reminder, or creates it when there is
 * none or the user deleted it.
 */
export const saveAssignmentEvent = async (
  type: AssignmentEventType,
  settings: SettingsState,
  calendar: Calendar.ExpoCalendar,
  input: AssignmentEventInput,
) => {
  const { assignmentId } = input;
  const syncedId = getAssignmentEventIds(type)[assignmentId];
  const reminder = isReminderList(type);

  if (syncedId) {
    let entry;
    try {
      entry = await getEntry(type, syncedId);
    } catch {
      // Deleted outside learnX: made again below.
      removeEventIdForAssignment(type, assignmentId);
    }
    if (entry) {
      await (reminder
        ? (entry as Calendar.ExpoCalendarReminder).update({
            ...buildAssignmentReminderDetails(settings, input),
            // Reminders written before had one; null clears it.
            startDate: null as unknown as undefined,
          })
        : (entry as Calendar.ExpoCalendarEvent).update(
            buildAssignmentEventDetails(settings, input),
          ));
      return;
    }
  }
  const id = reminder
    ? (
        await calendar.createReminder(
          buildAssignmentReminderDetails(settings, input),
        )
      ).id
    : (await calendar.createEvent(buildAssignmentEventDetails(settings, input)))
        .id;
  if (id) {
    setEventIdForAssignment(type, assignmentId, id);
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
  await Promise.all(
    ids
      .filter(id => synced[id])
      .map(async id => {
        try {
          await (await getEntry(type, synced[id])).delete();
        } catch {}
        removeEventIdForAssignment(type, id);
      }),
  );
};

/**
 * Writes `assignments` to the calendar or reminders, and deletes the entries
 * of `removed` (assignments archived or hidden since they were written).
 * `ask` asks for the permission when it's missing; see `requirePermission`.
 * Required, so a new caller decides whether it may show a prompt.
 */
export const saveAssignmentsToReminderOrCalendar = async (
  type: AssignmentEventType,
  assignments: Assignment[],
  removed: string[],
  { ask }: { ask: boolean },
) => {
  const settings = getSettings();

  await requireAssignmentAccess(type, { ask });

  const calendar = isReminderList(type)
    ? await getAssignmentReminder()
    : await getAssignmentCalendar();

  const inputs = buildAssignmentEventInputs(assignments, getCachedCourses());
  await adoptExistingEntries(type, calendar, inputs);

  await Promise.all(
    inputs.map(input => saveAssignmentEvent(type, settings, calendar, input)),
  );
  await removeAssignmentEvents(type, removed);
};

/**
 * Deletes the calendars and the Reminders list learnX created or adopted.
 * Asks for Reminders access only when there may be a list to delete: one was
 * made, or Reminders sync is on.
 */
export const removeCalendars = async () => {
  await requirePermission('calendar', { ask: true });

  const synced = getCalendarSync();
  const reminderList =
    Platform.OS === 'ios' &&
    (!!synced.assignmentReminderId ||
      getSettings().assignmentReminderSync ||
      (await hasPermission('reminder')));
  if (reminderList) {
    await requirePermission('reminder', { ask: true });
  }

  // Events only: with no type, iOS also needs Reminders access.
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const reminders = reminderList
    ? await Calendar.getCalendars(Calendar.EntityTypes.REMINDER)
    : [];

  // Only the ones learnX created or adopted, not every title with learnX.
  const existingCalendars = [...calendars, ...reminders].filter(c =>
    isSyncedCalendar(c, synced),
  );

  await Promise.all(existingCalendars.map(c => c.delete().catch(() => {})));

  resetCalendarSync();
};

export const exportSyncedCalendarsToICS = async () => {
  await requirePermission('calendar', { ask: true });

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
