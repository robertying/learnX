import {SettingsAction} from 'data/types/actions';
import {
  CLEAR_EVENT_IDS,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  REMOVE_EVENT_ID_FOR_ASSIGNMENT,
  SET_SETTING,
} from 'data/types/constants';
import {SettingsState} from 'data/types/state';

export default function settings(
  state: SettingsState = {
    assignmentSync: false,
    syncAssignmentsToCalendar: false,
    syncedAssignments: {},
    newUpdate: false,
    graduate: false,
    fileUseDocumentDir: false,
    fileOmitCourseName: false,
    tabFilterSelections: {
      notice: 'all',
      assignment: 'unfinished',
      file: 'all',
      course: 'all',
    },
    alarms: {
      assignmentAlarm: false,
      courseAlarm: false,
    },
    courseInformationSharing: false,
    courseInformationSharingBadgeShown: false,
    lastShowChangelogVersion: null,
  },
  action: SettingsAction,
): SettingsState {
  switch (action.type) {
    case SET_SETTING:
      const oldValue = state[action.payload.key];
      const newValue = action.payload.value;
      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        return {
          ...state,
          [action.payload.key]: {
            ...oldValue,
            ...newValue,
          },
        };
      } else {
        return {
          ...state,
          [action.payload.key]: newValue,
        };
      }
    case SET_EVENT_ID_FOR_ASSIGNMENT:
      return {
        ...state,
        syncedAssignments: {
          ...state.syncedAssignments,
          ...action.payload,
        },
      };
    case REMOVE_EVENT_ID_FOR_ASSIGNMENT:
      const syncedAssignments = {...state.syncedAssignments};
      delete syncedAssignments[action.payload];
      return {
        ...state,
        syncedAssignments,
      };
    case CLEAR_EVENT_IDS:
      return {
        ...state,
        syncedAssignments: {},
      };
    default:
      return state;
  }
}
