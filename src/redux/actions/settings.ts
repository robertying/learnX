import { createAction } from "typesafe-actions";
import {
  CLEAR_EVENT_IDS,
  SET_AUTO_REFRESHING,
  SET_CALENDAR_ID,
  SET_CALENDAR_SYNC,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  SET_TABS_ORDER
} from "../types/constants";
import { Tab } from "../types/state";

export const setTabsOrder = createAction(SET_TABS_ORDER, action => {
  return (tabs: ReadonlyArray<Tab>) => action(tabs);
});

export const setAutoRefreshing = createAction(SET_AUTO_REFRESHING, action => {
  return (enabled: boolean) => action(enabled);
});

export const setCalendarSync = createAction(SET_CALENDAR_SYNC, action => {
  return (enabled: boolean) => action(enabled);
});

export const setCalendarId = createAction(SET_CALENDAR_ID, action => {
  return (calendarId: string) => action(calendarId);
});

export const setEventIdForAssignment = createAction(
  SET_EVENT_ID_FOR_ASSIGNMENT,
  action => {
    return (assignmentId: string, eventId: string) =>
      action({ [assignmentId]: eventId });
  }
);

export const clearEventIds = createAction(CLEAR_EVENT_IDS);
