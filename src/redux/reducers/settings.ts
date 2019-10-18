import {ISettingsAction} from '../types/actions';
import {
  CLEAR_EVENT_IDS,
  SET_AUTO_REFRESHING,
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
import {ISettingsState, NotificationType} from '../types/state';

export default function settings(
  state: ISettingsState = {
    autoRefreshing: false,
    calendarSync: false,
    syncedAssignments: {},
    hasUpdate: false,
    notifications: true,
    notificationTypes: [
      NotificationType.Notices,
      NotificationType.Files,
      NotificationType.Assignments,
      NotificationType.Deadlines,
      NotificationType.Grades,
    ],
    lang: null,
    compactWidth: false,
  },
  action: ISettingsAction,
): ISettingsState {
  switch (action.type) {
    case SET_AUTO_REFRESHING:
      return {
        ...state,
        autoRefreshing: action.payload,
      };
    case SET_CALENDAR_SYNC:
      return {
        ...state,
        calendarSync: action.payload,
      };
    case SET_CALENDAR_ID:
      return {
        ...state,
        calendarId: action.payload,
      };
    case SET_EVENT_ID_FOR_ASSIGNMENT:
      return {
        ...state,
        syncedAssignments: {
          ...state.syncedAssignments,
          ...action.payload,
        },
      };
    case CLEAR_EVENT_IDS:
      return {
        ...state,
        syncedAssignments: {},
      };
    case SET_UPDATE:
      return {
        ...state,
        hasUpdate: action.payload,
      };
    case SET_WINDOW:
      return {
        ...state,
        window: action.payload,
      };
    case SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload,
      };
    case SET_NOTIFICATION_TYPES:
      return {
        ...state,
        notificationTypes: action.payload,
      };
    case SET_LANG:
      return {
        ...state,
        lang: action.payload,
      };
    case SET_COMPACT_WIDTH:
      return {
        ...state,
        compactWidth: action.payload,
      };
  }
  return state;
}
