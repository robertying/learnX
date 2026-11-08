import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarEvent, CalendarRange } from '@robertying/thu-learn-lib';
import {
  clearEventIds,
  getSettings,
  setEventIdForAssignment,
  setSetting,
  removeEventIdForAssignment,
} from 'data/settings';
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
  exportCalendarName,
  findSyncedCalendars,
  toICSEvent,
} from './eventDetails';
import { buildICS } from './ics';

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

const requirePermission = async (type: 'calendar' | 'reminder') => {
  if (!(await getAndRequestPermission(type))) {
    throw new Error(`Missing ${type} permission`);
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
    throw new Error('Cannot find any calendar source');
  }
};

const androidCalendarSource = {
  name: 'learnX',
  isLocalAccount: true,
} as Calendar.Source;

type CalendarIdSetting =
  | 'courseCalendarId'
  | 'assignmentCalendarId'
  | 'assignmentReminderId';

/**
 * Returns the stored calendar if it still exists, else adopts one with the
 * same title, else creates it. The id is saved under `setting`.
 */
const getOrCreateCalendar = async ({
  setting,
  title,
  name,
  entityType,
  listEntityType,
  onCreate,
}: {
  setting: CalendarIdSetting;
  title: string;
  name: string;
  entityType: Calendar.EntityTypes;
  /** Entity type passed to getCalendars; all types when undefined */
  listEntityType?: Calendar.EntityTypes;
  /** Runs before a new calendar is created */
  onCreate?: () => void;
}) => {
  const calendars = listEntityType
    ? await Calendar.getCalendars(listEntityType)
    : await Calendar.getCalendars();

  const storedId = getSettings()[setting];
  if (storedId) {
    if (calendars.some(value => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(value => value.title === title);
  if (existingCalendar) {
    setSetting(setting, existingCalendar.id);
    return existingCalendar.id;
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

  const newCalendarID = newCalendar.id;
  if (newCalendarID) {
    setSetting(setting, newCalendarID);
  }
  return newCalendarID;
};

export const getCourseCalendarId = () =>
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
  events: CalendarEvent[],
  startDate: Dayjs,
  endDate: Dayjs,
  failedRanges: CalendarRange[] = [],
) => {
  const settings = getSettings();

  await requirePermission('calendar');

  if (Platform.OS === 'ios') {
    await requirePermission('reminder');
  }

  const calendarId = await getCourseCalendarId();
  const calendar = await Calendar.ExpoCalendar.get(calendarId);

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

export const getAssignmentCalendarId = () =>
  getOrCreateCalendar({
    setting: 'assignmentCalendarId',
    title: assignmentCalendarReminderName,
    // Not a typo: this calendar has always used the course calendar's name
    name: courseCalendarName,
    entityType: Calendar.EntityTypes.EVENT,
    listEntityType: Calendar.EntityTypes.EVENT,
    onCreate: () => clearEventIds('calendar'),
  });

export const getAssignmentReminderId = () =>
  getOrCreateCalendar({
    setting: 'assignmentReminderId',
    title: assignmentCalendarReminderName,
    name: assignmentCalendarReminderName,
    entityType: Calendar.EntityTypes.REMINDER,
    listEntityType: Calendar.EntityTypes.REMINDER,
    onCreate: () => clearEventIds('reminder'),
  });

export const saveAssignmentEvent = async (
  type: 'calendar' | 'reminder',
  settings: SettingsState,
  calendar: Calendar.ExpoCalendar,
  input: AssignmentEventInput,
) => {
  const { assignmentId } = input;
  const syncedAssignments =
    type === 'calendar'
      ? settings.syncedCalendarAssignments
      : settings.syncedReminderAssignments;

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

export const saveAssignmentsToReminderOrCalendar = async (
  type: 'calendar' | 'reminder',
  assignments: Assignment[],
) => {
  const settings = getSettings();

  if (Platform.OS === 'ios' && type === 'reminder') {
    await requirePermission('reminder');
  } else {
    await requirePermission('calendar');
  }

  const calendarId =
    Platform.OS === 'ios' && type === 'reminder'
      ? await getAssignmentReminderId()
      : await getAssignmentCalendarId();
  const calendar = await Calendar.ExpoCalendar.get(calendarId);

  const inputs = buildAssignmentEventInputs(assignments, getCachedCourses());

  await Promise.all(
    inputs.map(
      async input => await saveAssignmentEvent(type, settings, calendar, input),
    ),
  );
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

  const existingCalendars = [...calendars, ...reminders].filter(c =>
    c.title.includes('learnX'),
  );

  await Promise.all(
    existingCalendars.map(async c => {
      await c.delete().catch(() => {});
    }),
  );

  setSetting('assignmentReminderId', undefined);
  setSetting('assignmentCalendarId', undefined);
  setSetting('syncedCalendarAssignments', {});
  setSetting('syncedReminderAssignments', {});
  setSetting('courseCalendarId', undefined);
};

export const exportSyncedCalendarsToICS = async () => {
  await requirePermission('calendar');

  const settings = getSettings();

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const { courseCalendars, assignmentCalendars } = findSyncedCalendars(
    calendars,
    settings,
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
    throw new Error('No synced events');
  }

  return buildICS(exportCalendarName, dedupeAndSortICSEvents(events));
};
