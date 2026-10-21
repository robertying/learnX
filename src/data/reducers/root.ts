import { combineReducers } from 'redux';
import { PersistConfig, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createSecureStore from 'redux-persist-expo-securestore';
import env from 'helpers/env';
import { isMockUser, isPersistentMockUser } from 'helpers/mock';
import { AppActions, StoreAction } from 'data/types/actions';
import {
  CLEAR_STORE,
  LOGIN_SUCCESS,
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

const getMockStore = () => require('data/mock').default;

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
    const mockStore: AppState = getMockStore();
    return {
      ...mockStore,
      auth: {
        ...mockStore.auth,
        username: action.payload.username,
        password:
          action.payload.username === env.DUMMY_PERSIST_USERNAME
            ? env.DUMMY_PERSIST_PASSWORD
            : env.DUMMY_PASSWORD,
      },
    };
  } else if (action.type === CLEAR_STORE) {
    state = undefined;
  } else if (state && isMockUser(state.auth.username)) {
    if (
      ![
        // The persistent mock user is logged out on relaunch and must be able
        // to log back in without hitting the network.
        ...(isPersistentMockUser(state.auth.username) ? [LOGIN_SUCCESS] : []),
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
