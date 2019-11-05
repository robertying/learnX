import {createAction} from 'typesafe-actions';
import {
  CLEAR_EVENT_IDS,
  SET_CALENDAR_ID,
  SET_CALENDAR_SYNC,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  SET_LANG,
  SET_NOTIFICATION_TYPES,
  SET_NOTIFICATIONS,
  SET_UPDATE,
  SET_WINDOW,
  SET_COMPACT_WIDTH,
} from '../types/constants';
import {IWindow, Language, NotificationType} from '../types/state';

export const setCalendarSync = createAction(
  SET_CALENDAR_SYNC,
  (enabled: boolean) => enabled,
)();

export const setCalendarId = createAction(
  SET_CALENDAR_ID,
  (calendarId: string) => calendarId,
)();

export const setEventIdForAssignment = createAction(
  SET_EVENT_ID_FOR_ASSIGNMENT,
  (assignmentId: string, eventId: string) => ({[assignmentId]: eventId}),
)();

export const clearEventIds = createAction(CLEAR_EVENT_IDS)();

export const setUpdate = createAction(
  SET_UPDATE,
  (hasNewUpdate: boolean) => hasNewUpdate,
)();

export const setWindow = createAction(
  SET_WINDOW,
  (window: IWindow) => window,
)();

export const setNotifications = createAction(
  SET_NOTIFICATIONS,
  (enabled: boolean) => enabled,
)();

export const setNotificationTypes = createAction(
  SET_NOTIFICATION_TYPES,
  (types: NotificationType[]) => types,
)();

export const setLang = createAction(SET_LANG, (lang: Language) => lang)();

export const setCompactWidth = createAction(
  SET_COMPACT_WIDTH,
  (compactWidth: boolean) => compactWidth,
)();
