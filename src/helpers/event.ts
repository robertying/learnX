import {Platform} from 'react-native';
import * as Calendar from 'expo-calendar';
import dayjs, {Dayjs} from 'dayjs';
import {CalendarEvent} from 'thu-learn-lib';
import {
  clearEventIds,
  setEventIdForAssignment,
  setSetting,
  removeEventIdForAssignment,
} from 'data/actions/settings';
import {store} from 'data/store';
import {Assignment, SettingsState} from 'data/types/state';
import Colors from 'constants/Colors';
import {removeTags} from './html';

const courseCalendarName = 'learnX 课表';
const assignmentCalendarReminderName = 'learnX 作业';

export const getAndRequestPermission = async (
  type: 'calendar' | 'reminder',
) => {
  if (type === 'calendar') {
    const {status} = await Calendar.getCalendarPermissionsAsync();
    if (status === 'granted') {
      return true;
    }
    const {status: newStatus} =
      await Calendar.requestCalendarPermissionsAsync();
    return newStatus === 'granted';
  } else {
    const {status} = await Calendar.getRemindersPermissionsAsync();
    if (status === 'granted') {
      return true;
    }
    const {status: newStatus} =
      await Calendar.requestRemindersPermissionsAsync();
    return newStatus === 'granted';
  }
};

const getDefaultCalendarSource = async (entityType: string) => {
  const calendars = await Calendar.getCalendarsAsync(entityType);

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

export const getCourseCalendarId = async () => {
  const calendars = await Calendar.getCalendarsAsync();

  const settings = store.getState().settings;

  const storedId = settings.courseCalendarId;
  if (storedId) {
    if (calendars.some(value => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(
    value => value.title === courseCalendarName,
  );
  if (existingCalendar) {
    store.dispatch(setSetting('courseCalendarId', existingCalendar.id));
    return existingCalendar.id;
  }

  const defaultCalendarSource =
    Platform.OS === 'ios'
      ? await getDefaultCalendarSource(Calendar.EntityTypes.EVENT)
      : ({name: 'learnX', isLocalAccount: true} as Calendar.Source);

  const newCalendarID = await Calendar.createCalendarAsync({
    title: courseCalendarName,
    color: Colors.plainTheme,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name: courseCalendarName,
    ownerAccount: 'learnX',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  if (newCalendarID) {
    store.dispatch(setSetting('courseCalendarId', newCalendarID));
  }
  return newCalendarID;
};

export const saveCoursesToCalendar = async (
  events: CalendarEvent[],
  startDate: Dayjs,
  endDate: Dayjs,
) => {
  const settings = store.getState().settings;

  if (!(await getAndRequestPermission('calendar'))) {
    throw new Error('Missing calendar permission');
  }

  if (Platform.OS === 'ios') {
    if (!(await getAndRequestPermission('reminder'))) {
      throw new Error('Missing reminder permission');
    }
  }

  const calendarId = await getCourseCalendarId();

  const oldEvents = await Calendar.getEventsAsync(
    [calendarId],
    startDate.toDate(),
    endDate.toDate(),
  );

  await Promise.all(
    oldEvents.map(async e => await Calendar.deleteEventAsync(e.id)),
  );

  const alarms = settings.alarms;

  await Promise.all(
    events.map(
      async e =>
        await Calendar.createEventAsync(calendarId, {
          title: e.courseName,
          startDate: dayjs(`${e.date} ${e.startTime}`).toDate(),
          endDate: dayjs(`${e.date} ${e.endTime}`).toDate(),
          location: e.location,
          notes: e.location,
          alarms: alarms.courseAlarm
            ? [
                {
                  relativeOffset: -(alarms.courseAlarmOffset ?? 15),
                },
              ]
            : [],
        }),
    ),
  );
};

export const getAssignmentCalendarId = async () => {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );

  const storedId = store.getState().settings.assignmentCalendarId;

  if (storedId) {
    if (calendars.some(value => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(
    value => value.title === assignmentCalendarReminderName,
  );
  if (existingCalendar) {
    store.dispatch(setSetting('assignmentCalendarId', existingCalendar.id));
    return existingCalendar.id;
  }

  store.dispatch(clearEventIds('calendar'));

  const defaultCalendarSource =
    Platform.OS === 'ios'
      ? await getDefaultCalendarSource(Calendar.EntityTypes.EVENT)
      : ({name: 'learnX', isLocalAccount: true} as Calendar.Source);

  const newCalendarID = await Calendar.createCalendarAsync({
    title: assignmentCalendarReminderName,
    color: Colors.plainTheme,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name: courseCalendarName,
    ownerAccount: 'learnX',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  if (newCalendarID) {
    store.dispatch(setSetting('assignmentCalendarId', newCalendarID));
  }
  return newCalendarID;
};

export const getAssignmentReminderId = async () => {
  const reminders = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.REMINDER,
  );

  const storedId = store.getState().settings.assignmentReminderId;
  if (storedId) {
    if (reminders.some(value => value.id === storedId)) {
      return storedId;
    }
  }

  const existingReminder = reminders.find(
    value => value.title === assignmentCalendarReminderName,
  );
  if (existingReminder) {
    store.dispatch(setSetting('assignmentReminderId', existingReminder.id));
    return existingReminder.id;
  }

  store.dispatch(clearEventIds('reminder'));

  const defaultCalendarSource = await getDefaultCalendarSource(
    Calendar.EntityTypes.REMINDER,
  );
  const newReminderID = await Calendar.createCalendarAsync({
    title: assignmentCalendarReminderName,
    color: Colors.plainTheme,
    entityType: Calendar.EntityTypes.REMINDER,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name: assignmentCalendarReminderName,
    ownerAccount: 'learnX',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  if (newReminderID) {
    store.dispatch(setSetting('assignmentReminderId', newReminderID));
  }
  return newReminderID;
};

export const saveAssignmentEvent = async (
  type: 'calendar' | 'reminder',
  settings: SettingsState,
  calendarId: string,
  assignmentId: string,
  title: string,
  note: string,
  startDate: Dayjs,
  dueDate: Dayjs,
  completed: boolean,
  completionDate?: Dayjs,
) => {
  const syncedAssignments =
    type === 'calendar'
      ? settings.syncedCalendarAssignments
      : settings.syncedReminderAssignments;
  const alarms = settings.alarms;

  if (Platform.OS === 'ios' && type === 'reminder') {
    const details: Calendar.Reminder = {
      title,
      startDate: startDate.toDate(),
      dueDate: alarms.assignmentReminderAlarm
        ? dueDate
            .subtract(alarms.assignmentReminderAlarmOffset ?? 24 * 60, 'minute')
            .toDate()
        : dueDate.toDate(),
      completed,
      completionDate: completionDate?.toDate(),
      notes: note,
    };
    if (
      syncedAssignments &&
      Object.keys(syncedAssignments).includes(assignmentId)
    ) {
      try {
        await Calendar.updateReminderAsync(
          syncedAssignments[assignmentId],
          details,
        );
      } catch {
        store.dispatch(removeEventIdForAssignment('reminder', assignmentId));
      }
    } else {
      const eventId = await Calendar.createReminderAsync(calendarId, details);
      store.dispatch(
        setEventIdForAssignment('reminder', assignmentId, eventId),
      );
    }
  } else {
    const alerts = alarms.assignmentCalendarAlarm
      ? [
          {
            relativeOffset: -(alarms.assignmentCalendarAlarmOffset ?? 24 * 60),
            method: Calendar.AlarmMethod.DEFAULT,
          },
        ]
      : [];
    if (
      alarms.assignmentCalendarAlarm &&
      alarms.assignmentCalendarSecondAlarm
    ) {
      alerts.push({
        relativeOffset: -(alarms.assignmentCalendarSecondAlarmOffset ?? 30),
        method: Calendar.AlarmMethod.DEFAULT,
      });
    }

    const details: Partial<Calendar.Event> = {
      title: (completed ? '✅ ' : '') + title,
      startDate: dueDate
        .subtract(settings.calendarEventLength ?? 30, 'minute')
        .toDate(),
      endDate: dueDate.toDate(),
      notes: note,
      alarms: alerts,
    };
    if (
      syncedAssignments &&
      Object.keys(syncedAssignments).includes(assignmentId)
    ) {
      try {
        await Calendar.updateEventAsync(
          syncedAssignments[assignmentId],
          details,
        );
      } catch {
        store.dispatch(removeEventIdForAssignment('calendar', assignmentId));
      }
    } else {
      const eventId = await Calendar.createEventAsync(calendarId, details);
      store.dispatch(
        setEventIdForAssignment('calendar', assignmentId, eventId),
      );
    }
  }
};

export const saveAssignmentsToReminderOrCalendar = async (
  type: 'calendar' | 'reminder',
  assignments: Assignment[],
) => {
  const settings = store.getState().settings;

  if (Platform.OS === 'ios' && type === 'reminder') {
    if (!(await getAndRequestPermission('reminder'))) {
      throw new Error('Missing reminder permission');
    }
  } else {
    if (!(await getAndRequestPermission('calendar'))) {
      throw new Error('Missing calendar permission');
    }
  }

  const calendarId =
    Platform.OS === 'ios' && type === 'reminder'
      ? await getAssignmentReminderId()
      : await getAssignmentCalendarId();

  const savingAssignments = [...assignments].filter(item =>
    dayjs(item.deadline).isAfter(dayjs()),
  );

  const courses = store.getState().courses.items;

  await Promise.all(
    savingAssignments.map(async assignment => {
      const course = courses.find(value => value.id === assignment.courseId);
      if (course) {
        await saveAssignmentEvent(
          type,
          settings,
          calendarId,
          assignment.id,
          assignment.title + ' - ' + course.name,
          removeTags(assignment.description),
          dayjs(),
          dayjs(assignment.deadline),
          assignment.submitted,
          assignment.submitTime ? dayjs(assignment.submitTime) : undefined,
        );
      }
    }),
  );
};

export const removeCalendars = async () => {
  if (!(await getAndRequestPermission('calendar'))) {
    throw new Error('Missing calendar permission');
  }

  if (Platform.OS === 'ios') {
    if (!(await getAndRequestPermission('reminder'))) {
      throw new Error('Missing reminder permission');
    }
  }

  const calendars = await Calendar.getCalendarsAsync();
  const reminders =
    Platform.OS === 'ios'
      ? await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER)
      : [];

  const existingCalendars = [...calendars, ...reminders].filter(c =>
    c.title.includes('learnX'),
  );

  await Promise.all(
    existingCalendars.map(async c => {
      await Calendar.deleteCalendarAsync(c.id).catch(() => {});
    }),
  );

  store.dispatch(setSetting('assignmentReminderId', undefined));
  store.dispatch(setSetting('assignmentCalendarId', undefined));
  store.dispatch(setSetting('syncedCalendarAssignments', {}));
  store.dispatch(setSetting('syncedReminderAssignments', {}));
  store.dispatch(setSetting('courseCalendarId', undefined));
};
