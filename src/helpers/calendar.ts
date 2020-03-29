import RNCalendarEvents from 'react-native-calendar-events';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {
  clearEventIds,
  setEventIdForAssignment,
  setSetting,
} from '../redux/actions/settings';
import {store} from '../redux/store';
import {IAssignment} from '../redux/types/state';
import {getTranslation} from './i18n';
import Snackbar from 'react-native-snackbar';
import {CalendarEvent} from 'thu-learn-lib-no-native/lib/types';
import {removeTags} from './html';
import {Dayjs} from 'dayjs';

export const getCalendarId = async () => {
  const calendars = await RNCalendarEvents.findCalendars();

  const storedId = store.getState().settings.calendarId;
  if (storedId) {
    if (calendars.some((value) => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find((value) => value.title === 'learnX');
  if (existingCalendar) {
    store.dispatch(setSetting('calendarId', existingCalendar.id));
    return existingCalendar.id;
  }

  store.dispatch(clearEventIds());

  const newId = await RNCalendarEvents.saveCalendar({
    title: 'learnX',
    color: Colors.theme,
    entityType: 'event',
    name: 'learnX',
    accessLevel: 'read',
    ownerAccount: 'learnX',
    source: {
      name: 'learnX',
      isLocalAccount: true,
    },
  });
  if (newId) {
    store.dispatch(setSetting('calendarId', newId));
  }
  return newId;
};

export const saveAssignmentEvent = async (
  calendarId: string,
  assignmentId: string,
  title: string,
  note: string,
  startTime: string,
  endTime: string,
) => {
  const syncedAssignments = store.getState().settings.syncedAssignments;
  if (
    syncedAssignments &&
    Object.keys(syncedAssignments).includes(assignmentId)
  ) {
    await RNCalendarEvents.saveEvent(title, {
      id: syncedAssignments[assignmentId],
      calendarId,
      startDate: startTime,
      endDate: endTime,
      notes: note,
      description: note,
    });
  } else {
    const eventId = await RNCalendarEvents.saveEvent(title, {
      calendarId,
      startDate: startTime,
      endDate: endTime,
      notes: note,
      description: note,
    });
    store.dispatch(setEventIdForAssignment(assignmentId, eventId));
  }
};

export const saveAssignmentsToCalendar = async (assignments: IAssignment[]) => {
  const status = await RNCalendarEvents.authorizationStatus();
  if (status !== 'authorized') {
    Snackbar.show({
      text: getTranslation('accessCalendarFailure'),
      duration: Snackbar.LENGTH_SHORT,
    });
    return;
  }

  const calendarId = await getCalendarId();

  if (!calendarId) {
    throw 'Failed to create new calendar';
  }

  const savingAssignments = [...assignments].filter((item) =>
    dayjs(item.deadline).isAfter(dayjs()),
  );

  const courses = store.getState().courses.items;

  savingAssignments.forEach(async (assignment) => {
    const course = courses.find((value) => value.id === assignment.courseId);
    if (course) {
      await saveAssignmentEvent(
        calendarId,
        assignment.id,
        (assignment.submitted ? '✅ ' : '') +
          assignment.title +
          ' - ' +
          course.name,
        removeTags(assignment.description),
        assignment.deadline,
        assignment.deadline,
      );
    }
  });
};

export const getCourseCalendarId = async () => {
  const calendars = await RNCalendarEvents.findCalendars();

  const existingCalendar = calendars.find(
    (value) => value.title === 'learnX - Course',
  );
  if (existingCalendar) {
    return existingCalendar.id;
  }

  const newId = await RNCalendarEvents.saveCalendar({
    title: 'learnX - Course',
    color: Colors.theme,
    entityType: 'event',
    name: 'learnX - Course',
    accessLevel: 'read',
    ownerAccount: 'learnX',
    source: {
      name: 'learnX',
      isLocalAccount: true,
    },
  });

  return newId;
};

export const getSemesterDuration = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() /* 0-11 */ + 1;

  if (month >= 7) {
    return {
      startDate: `${year}0901`,
      midEndDate: `${year}1101`,
      midStartDate: `${year}1102`,
      endDate: `${year + 1}0201`,
    };
  } else if (month === 1) {
    return {
      startDate: `${year - 1}0901`,
      midEndDate: `${year - 1}1101`,
      midStartDate: `${year - 1}1102`,
      endDate: `${year}0201`,
    };
  } else {
    return {
      startDate: `${year}0201`,
      midEndDate: `${year}0501`,
      midStartDate: `${year}0502`,
      endDate: `${year}0701`,
    };
  }
};

export const saveCoursesToCalendar = async (
  events: CalendarEvent[],
  startDate: Dayjs,
  endDate: Dayjs,
) => {
  const status = await RNCalendarEvents.authorizationStatus();
  if (status !== 'authorized') {
    Snackbar.show({
      text: getTranslation('accessCalendarFailure'),
      duration: Snackbar.LENGTH_SHORT,
    });
    return;
  }

  const calendarId = await getCourseCalendarId();

  const oldEvents = await RNCalendarEvents.fetchAllEvents(
    startDate.toISOString(),
    endDate.toISOString(),
    [calendarId],
  );

  for (const e of oldEvents) {
    await RNCalendarEvents.removeEvent(e.id);
  }

  for (const event of events) {
    await RNCalendarEvents.saveEvent(event.courseName, {
      calendarId,
      startDate: dayjs(`${event.date} ${event.startTime}`).toISOString(),
      endDate: dayjs(`${event.date} ${event.endTime}`).toISOString(),
      location: event.location,
      description: event.location,
    });
  }
};

export const removeCalendars = async () => {
  const status = await RNCalendarEvents.authorizationStatus();
  if (status !== 'authorized') {
    Snackbar.show({
      text: getTranslation('accessCalendarFailure'),
      duration: Snackbar.LENGTH_SHORT,
    });
    return;
  }

  const calendars = await RNCalendarEvents.findCalendars();

  const existingCalendars = calendars.filter((value) =>
    value.title.includes('learnX'),
  );

  for (const calendar of existingCalendars) {
    await RNCalendarEvents.removeCalendar(calendar.id);
  }

  Snackbar.show({
    text: getTranslation('deleteCalendarsSuccess'),
    duration: Snackbar.LENGTH_SHORT,
  });
};
