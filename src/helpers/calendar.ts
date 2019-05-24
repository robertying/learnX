import RNCalendarEvents from "react-native-calendar-events";
import Colors from "../constants/Colors";
import {
  clearEventIds,
  setCalendarId,
  setEventIdForAssignment
} from "../redux/actions/settings";
import { showToast } from "../redux/actions/toast";
import { store } from "../redux/store";
import { IAssignment } from "../redux/types/state";
import { getTranslation } from "./i18n";

export const createCalendar = async () => {
  const calendars = await RNCalendarEvents.findCalendars();

  const storedId = store.getState().settings.calendarId;
  if (storedId) {
    if (calendars.some(value => value.id === storedId)) {
      return storedId;
    }
  }

  const existingCalendar = calendars.find(value => value.title === "learnX");
  if (existingCalendar) {
    store.dispatch(setCalendarId(existingCalendar.id));
    return existingCalendar.id;
  }

  store.dispatch(clearEventIds());
  const newId = await RNCalendarEvents.saveCalendar({
    title: "learnX",
    color: Colors.tint,
    entityType: "event",
    name: "learnX",
    accessLevel: "read",
    ownerAccount: "learnX",
    source: {
      name: "learnX",
      type: "learnX",
      isLocalAccount: true
    }
  });
  if (newId) {
    store.dispatch(setCalendarId(newId));
  }
  return newId;
};

export const saveAssignmentEvent = (
  assignmentId: string,
  title: string,
  note: string,
  startTime: string,
  endTime: string
) => {
  return new Promise(async (resolve, reject) => {
    const status = await RNCalendarEvents.authorizationStatus();
    if (status !== "authorized") {
      const result = await RNCalendarEvents.authorizeEventStore();
      if (result !== "authorized") {
        store.dispatch(
          showToast(getTranslation("accessCalendarFailure"), 1500)
        );
        reject("Unauthorized");
      }
    }

    const id = await createCalendar();
    if (id) {
      const syncedAssignments = store.getState().settings.syncedAssignments;
      if (
        syncedAssignments &&
        Object.keys(syncedAssignments).includes(assignmentId)
      ) {
        await RNCalendarEvents.saveEvent(title, {
          id: syncedAssignments[assignmentId],
          calendarId: id,
          startDate: startTime,
          endDate: endTime,
          notes: note,
          description: note
        });
        resolve();
      } else {
        const eventId = await RNCalendarEvents.saveEvent(title, {
          calendarId: id,
          startDate: startTime,
          endDate: endTime,
          notes: note,
          description: note
        });
        store.dispatch(setEventIdForAssignment(assignmentId, eventId));
        resolve();
      }
    }
    reject("Failed to create new calendar");
  });
};

export const saveAssignmentsToCalendar = async (
  assignments: readonly IAssignment[]
) => {
  const status = await RNCalendarEvents.authorizationStatus();
  if (status !== "authorized") {
    const result = await RNCalendarEvents.authorizeEventStore();
    if (result !== "authorized") {
      store.dispatch(showToast(getTranslation("accessCalendarFailure"), 1500));
      return;
    }
  }

  const courses = store.getState().courses.items;

  for (const assignment of assignments) {
    const course = courses.find(value => value.id === assignment.courseId);
    if (course) {
      await saveAssignmentEvent(
        assignment.id,
        (assignment.submitted ? "✅ " : "") +
          assignment.title +
          " - " +
          course.name,
        assignment.description || "",
        assignment.deadline,
        assignment.deadline
      );
    }
  }
};
