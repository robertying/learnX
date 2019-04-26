import { ISettingsAction } from "../types/actions";
import {
  CLEAR_EVENT_IDS,
  SET_AUTO_REFRESHING,
  SET_CALENDAR_ID,
  SET_CALENDAR_SYNC,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  SET_TABS_ORDER
} from "../types/constants";
import { ISettingsState, Tab } from "../types/state";

export default function settings(
  state: ISettingsState = {
    tabsOrder: [
      Tab.Notices,
      Tab.Files,
      Tab.Assignments,
      Tab.Courses,
      Tab.Settings
    ],
    autoRefreshing: false,
    calendarSync: false,
    syncedAssignments: {}
  },
  action: ISettingsAction
): ISettingsState {
  switch (action.type) {
    case SET_TABS_ORDER:
      return {
        ...state,
        tabsOrder: action.payload
      };
    case SET_AUTO_REFRESHING:
      return {
        ...state,
        autoRefreshing: action.payload
      };
    case SET_CALENDAR_SYNC:
      return {
        ...state,
        calendarSync: action.payload
      };
    case SET_CALENDAR_ID:
      return {
        ...state,
        calendarId: action.payload
      };
    case SET_EVENT_ID_FOR_ASSIGNMENT:
      return {
        ...state,
        syncedAssignments: {
          ...state.syncedAssignments,
          ...action.payload
        }
      };
    case CLEAR_EVENT_IDS:
      return {
        ...state,
        syncedAssignments: {}
      };
  }
  return state;
}
