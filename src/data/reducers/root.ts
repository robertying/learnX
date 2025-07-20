import { combineReducers } from 'redux';
import { PersistConfig, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createSecureStore from 'redux-persist-expo-securestore';
import env from 'helpers/env';
import mockStore from 'data/mock';
import { AppActions, StoreAction } from 'data/types/actions';
import {
  CLEAR_STORE,
  SET_MOCK_STORE,
  RESET_LOADING,
  SET_FAV_ASSIGNMENT,
  SET_HIDE_COURSE,
  SET_COURSE_ORDER,
  SET_FAV_NOTICE,
  SET_ARCHIVE_NOTICES,
  SET_FAV_FILE,
  SET_ARCHIVE_FILES,
  SET_ARCHIVE_ASSIGNMENTS,
  SET_PENDING_ASSIGNMENT_DATA,
  SET_SETTING,
  SET_CURRENT_SEMESTER,
} from 'data/types/constants';
import { AppState, AuthState, SettingsState } from 'data/types/state';
import assignments from './assignments';
import courses from './courses';
import files from './files';
import notices from './notices';
import semesters from './semesters';
import auth from './auth';
import user from './user';
import settings from './settings';

export const mainReducers = {
  user,
  semesters,
  courses,
  notices,
  assignments,
  files,
};

const authPersistConfig: PersistConfig<AuthState> = {
  key: 'auth',
  storage: createSecureStore(),
  whitelist: [
    'username',
    'password',
    'fingerPrint',
    'fingerGenPrint',
    'fingerGenPrint3',
  ],
};
const settingsPersistConfig: PersistConfig<SettingsState> = {
  key: 'settings',
  storage: AsyncStorage,
  blacklist: ['newUpdate'],
};

const appReducer = combineReducers({
  auth: persistReducer(authPersistConfig, auth),
  settings: persistReducer(settingsPersistConfig, settings),
  ...mainReducers,
});

export function rootReducer(
  state: AppState | undefined,
  action: AppActions,
): AppState {
  if (state && action.type === RESET_LOADING) {
    return {
      ...state,
      auth: {
        ...state.auth,
        loggingIn: false,
      },
      semesters: {
        ...state.semesters,
        fetching: false,
        error: null,
      },
      courses: {
        ...state.courses,
        fetching: false,
        error: null,
      },
      notices: {
        ...state.notices,
        fetching: false,
        error: null,
      },
      files: {
        ...state.files,
        fetching: false,
        error: null,
      },
      assignments: {
        ...state.assignments,
        fetching: false,
        error: null,
      },
    };
  }

  if (action.type === SET_MOCK_STORE) {
    return mockStore;
  } else if (action.type === CLEAR_STORE) {
    state = undefined;
  } else if (state && state.auth.username === env.DUMMY_USERNAME) {
    if (
      ![
        SET_FAV_NOTICE,
        SET_ARCHIVE_NOTICES,
        SET_FAV_FILE,
        SET_ARCHIVE_FILES,
        SET_FAV_ASSIGNMENT,
        SET_ARCHIVE_ASSIGNMENTS,
        SET_PENDING_ASSIGNMENT_DATA,
        SET_HIDE_COURSE,
        SET_COURSE_ORDER,
        SET_CURRENT_SEMESTER,
        SET_SETTING,
      ].includes(action.type)
    ) {
      return state;
    }
  }
  return appReducer(state, action as Exclude<AppActions, StoreAction>);
}
