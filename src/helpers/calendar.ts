import RNCalendarEvents from 'react-native-calendar-events';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {
  clearEventIds,
  setCalendarId,
  setEventIdForAssignment,
} from '../redux/actions/settings';
import {store} from '../redux/store';
import {IAssignment} from '../redux/types/state';
import {getTranslation} from './i18n';
import SnackBar from 'react-native-snackbar';
import {CalendarEvent} from 'thu-learn-lib-no-native/lib/types';

export const getCalendar = async () => {
  const calendars = await RNCalendarEvents.findCalendars();

  const storedId = store.getState().settings.calendarId;
  if (storedId) {
    if (calendars.some(value => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(value => value.title === 'learnX');
  if (existingCalendar) {
    store.dispatch(setCalendarId(existingCalendar.id));
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
      type: 'learnX',
      isLocalAccount: true,
    },
  });
  if (newId) {
    store.dispatch(setCalendarId(newId));
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
    SnackBar.show({
      title: getTranslation('accessCalendarFailure'),
      duration: SnackBar.LENGTH_SHORT,
    });
    return;
  }

  const calendarId = await getCalendar();

  if (!calendarId) {
    throw 'Failed to create new calendar';
  }

  const savingAssignments = [...assignments].filter(item =>
    dayjs(item.deadline).isAfter(dayjs()),
  );

  const courses = store.getState().courses.items;

  savingAssignments.forEach(async assignment => {
    const course = courses.find(value => value.id === assignment.courseId);
    if (course) {
      await saveAssignmentEvent(
        calendarId,
        assignment.id,
        (assignment.submitted ? '✅ ' : '') +
          assignment.title +
          ' - ' +
          course.name,
        assignment.description || '',
        assignment.deadline,
        assignment.deadline,
      );
    }
  });
};

export const getCourseCalendar = async () => {
  const calendars = await RNCalendarEvents.findCalendars();

  const existingCalendar = calendars.find(
    value => value.title === 'learnX - Course',
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
    ownerAccount: 'learnX - Course',
    source: {
      name: 'learnX - Course',
      type: 'learnX - Course',
      isLocalAccount: true,
    },
  });

  return newId;
};

export const getSemesterDuration = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
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
  startDate: string,
  endDate: string,
) => {
  const status = await RNCalendarEvents.authorizationStatus();
  if (status !== 'authorized') {
    SnackBar.show({
      title: getTranslation('accessCalendarFailure'),
      duration: SnackBar.LENGTH_SHORT,
    });
    return;
  }

  const calendarId = await getCourseCalendar();

  const oldEvents = await RNCalendarEvents.fetchAllEvents(
    dayjs(startDate).toISOString(),
    dayjs(endDate).toISOString(),
    [calendarId],
  );

  await Promise.all(
    oldEvents.map(async e => await RNCalendarEvents.removeEvent(e.id)),
  );

  events.forEach(async event => {
    await RNCalendarEvents.saveEvent(event.courseName, {
      calendarId,
      startDate: dayjs(`${event.date} ${event.startTime}`).toISOString(),
      endDate: dayjs(`${event.date} ${event.endTime}`).toISOString(),
      notes: event.location,
      description: event.location,
    });
  });
};
