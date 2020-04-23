import * as Calendar from 'expo-calendar';
import Snackbar from 'react-native-snackbar';
import {Dayjs} from 'dayjs';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {
  clearEventIds,
  setEventIdForAssignment,
  setSetting,
  removeEventIdForAssignment,
} from '../redux/actions/settings';
import {store} from '../redux/store';
import {IAssignment, ISettingsState} from '../redux/types/state';
import {getTranslation} from './i18n';
import {CalendarEvent} from 'thu-learn-lib-no-native/lib/types';
import {removeTags} from './html';
import {Platform} from 'react-native';

async function getDefaultCalendarSource(entityType: string) {
  const calendars = await Calendar.getCalendarsAsync(entityType);

  const iCloudCalendar = calendars.find((c) => c.source.name === 'iCloud');
  if (iCloudCalendar) {
    return iCloudCalendar.source;
  }

  const localCalendar = calendars.find(
    (c) => c.source.type === Calendar.SourceType.LOCAL,
  );
  return localCalendar!.source;
}

export const getCourseCalendarId = async () => {
  const calendars = await Calendar.getCalendarsAsync();

  const storedId = store.getState().settings.courseCalendarId;
  if (storedId) {
    if (calendars.some((value) => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(
    (value) => value.title === getTranslation('courseCalendarName'),
  );
  if (existingCalendar) {
    store.dispatch(setSetting('courseCalendarId', existingCalendar.id));
    return existingCalendar.id;
  }

  const defaultCalendarSource =
    Platform.OS === 'ios'
      ? await getDefaultCalendarSource(Calendar.EntityTypes.EVENT)
      : ({isLocalAccount: true, name: 'learnX'} as Calendar.Source);

  const newCalendarID = await Calendar.createCalendarAsync({
    title: getTranslation('courseCalendarName'),
    color: Colors.theme,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name: getTranslation('courseCalendarName'),
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
  const {status} = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Snackbar.show({
      text: getTranslation('accessCalendarFailure'),
      duration: Snackbar.LENGTH_LONG,
    });
    return;
  }

  const calendarId = await getCourseCalendarId();

  const oldEvents = await Calendar.getEventsAsync(
    [calendarId],
    startDate.toDate(),
    endDate.toDate(),
  );

  await Promise.all(
    oldEvents.map(async (e) => await Calendar.deleteEventAsync(e.id)),
  );

  const alarms = store.getState().settings.alarms;

  await Promise.all(
    events.map(
      async (e) =>
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

export const getAssignmentCalendarIdAndroid = async () => {
  const calendars = await Calendar.getCalendarsAsync();

  const storedId = store.getState().settings.assignmentCalendarId;
  if (storedId) {
    if (calendars.some((value) => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(
    (value) => value.title === getTranslation('assignmentCalendarName'),
  );
  if (existingCalendar) {
    store.dispatch(setSetting('assignmentCalendarId', existingCalendar.id));
    return existingCalendar.id;
  }

  store.dispatch(clearEventIds());

  const newCalendarID = await Calendar.createCalendarAsync({
    title: getTranslation('assignmentCalendarName'),
    color: Colors.theme,
    entityType: Calendar.EntityTypes.EVENT,
    source: {
      isLocalAccount: true,
      name: 'learnX',
      type: Calendar.SourceType.LOCAL,
    },
    name: getTranslation('assignmentCalendarName'),
    ownerAccount: 'learnX',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  if (newCalendarID) {
    store.dispatch(setSetting('assignmentCalendarId', newCalendarID));
  }
  return newCalendarID;
};

export const getAssignmentReminderIdIOS = async () => {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.REMINDER,
  );

  const storedId = store.getState().settings.assignmentCalendarId;
  if (storedId) {
    if (calendars.some((value) => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(
    (value) => value.title === getTranslation('assignmentCalendarName'),
  );
  if (existingCalendar) {
    store.dispatch(setSetting('assignmentCalendarId', existingCalendar.id));
    return existingCalendar.id;
  }

  store.dispatch(clearEventIds());

  const defaultCalendarSource = await getDefaultCalendarSource(
    Calendar.EntityTypes.REMINDER,
  );
  const newCalendarID = await Calendar.createCalendarAsync({
    title: getTranslation('assignmentCalendarName'),
    color: Colors.theme,
    entityType: Calendar.EntityTypes.REMINDER,
    sourceId: defaultCalendarSource.id,
    source: defaultCalendarSource,
    name: getTranslation('assignmentCalendarName'),
    ownerAccount: 'learnX',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  if (newCalendarID) {
    store.dispatch(setSetting('assignmentCalendarId', newCalendarID));
  }
  return newCalendarID;
};

export const saveAssignmentEvent = async (
  settings: ISettingsState,
  calendarId: string,
  assignmentId: string,
  title: string,
  note: string,
  startDate: Dayjs,
  dueDate: Dayjs,
  completed: boolean,
  completionDate?: Dayjs,
) => {
  const syncedAssignments = settings.syncedAssignments;
  const alarms = settings.alarms;

  if (Platform.OS === 'ios') {
    const details: Calendar.Reminder = {
      title,
      startDate: startDate.toDate(),
      dueDate: dueDate.toDate(),
      completed,
      completionDate: completionDate?.toDate(),
      notes: note,
      alarms: alarms.assignmentAlarm
        ? [
            {
              relativeOffset: -(alarms.assignmentAlarmOffset ?? 24 * 60),
            },
          ]
        : [],
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
        store.dispatch(removeEventIdForAssignment(assignmentId));
      }
    } else {
      const eventId = await Calendar.createReminderAsync(calendarId, details);
      store.dispatch(setEventIdForAssignment(assignmentId, eventId));
    }
  } else {
    const details: Partial<Calendar.Event> = {
      title: (completed ? '✅ ' : '') + title,
      startDate: dueDate.subtract(1, 'hour').toDate(),
      endDate: dueDate.toDate(),
      notes: note,
      alarms: alarms.assignmentAlarm
        ? [
            {
              relativeOffset: -(alarms.assignmentAlarmOffset ?? 24 * 60),
              method: Calendar.AlarmMethod.DEFAULT,
            },
          ]
        : [],
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
        store.dispatch(removeEventIdForAssignment(assignmentId));
      }
    } else {
      const eventId = await Calendar.createEventAsync(calendarId, details);
      store.dispatch(setEventIdForAssignment(assignmentId, eventId));
    }
  }
};

export const saveAssignmentsToCalendar = async (assignments: IAssignment[]) => {
  const {status} = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Snackbar.show({
      text: getTranslation('accessCalendarFailure'),
      duration: Snackbar.LENGTH_LONG,
    });
    return;
  }
  if (Platform.OS === 'ios') {
    const {status} = await Calendar.requestRemindersPermissionsAsync();
    if (status !== 'granted') {
      Snackbar.show({
        text: getTranslation('accessReminderFailure'),
        duration: Snackbar.LENGTH_LONG,
      });
      return;
    }
  }

  const calendarId = await (Platform.OS === 'ios'
    ? getAssignmentReminderIdIOS()
    : getAssignmentCalendarIdAndroid());

  const savingAssignments = [...assignments].filter((item) =>
    dayjs(item.deadline).isAfter(dayjs()),
  );
  const courses = store.getState().courses.items;
  const settings = store.getState().settings;

  await Promise.all(
    savingAssignments.map(async (assignment) => {
      const course = courses.find((value) => value.id === assignment.courseId);
      if (course) {
        await saveAssignmentEvent(
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
  const {status} = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Snackbar.show({
      text: getTranslation('accessCalendarFailure'),
      duration: Snackbar.LENGTH_LONG,
    });
    return;
  }
  if (Platform.OS === 'ios') {
    const {status} = await Calendar.requestRemindersPermissionsAsync();
    if (status !== 'granted') {
      Snackbar.show({
        text: getTranslation('accessReminderFailure'),
        duration: Snackbar.LENGTH_LONG,
      });
      return;
    }
  }

  const calendars = await Calendar.getCalendarsAsync();
  const reminders =
    Platform.OS === 'ios'
      ? await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER)
      : [];

  const existingCalendars = [...calendars, ...reminders].filter((c) =>
    c.title.includes('learnX'),
  );

  await Promise.all(
    existingCalendars.map(async (c) => {
      await Calendar.deleteCalendarAsync(c.id).catch(() => {});
    }),
  );

  Snackbar.show({
    text: getTranslation('deleteCalendarsSuccess'),
    duration: Snackbar.LENGTH_LONG,
  });
};
