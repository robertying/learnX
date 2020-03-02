import {ISettingsAction} from '../types/actions';
import {
  CLEAR_EVENT_IDS,
  SET_EVENT_ID_FOR_ASSIGNMENT,
  SET_SETTING,
} from '../types/constants';
import {ISettingsState, Entity, Language} from '../types/state';

export default function settings(
  state: ISettingsState = {
    calendarSync: false,
    syncedAssignments: {},
    hasUpdate: false,
    lang: Language.en,
    isCompact: false,
    hasUnread: [Entity.File, Entity.Assignment, Entity.Notice],
    graduate: false,
  },
  action: ISettingsAction,
): ISettingsState {
  switch (action.type) {
    case SET_SETTING:
      return {
        ...state,
        [action.payload.key]: action.payload.value,
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
  }
  return state;
}
