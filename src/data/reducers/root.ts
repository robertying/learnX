import { combineReducers } from 'redux';
import { PersistConfig, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createSecureStore from 'redux-persist-expo-securestore';
import env from 'helpers/env';
import { isEphemeralMockUser } from 'helpers/mock';
import { AppActions, StoreAction } from 'data/types/actions';
import {
  CLEAR_STORE,
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  SET_MOCK_STORE,
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

const authActions: string[] = [LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE];

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
  } else if (
    state &&
    isEphemeralMockUser(state.auth.username) &&
    authActions.includes(action.type)
  ) {
    // Auth persists on every change, which would keep the ephemeral mock
    // login across relaunches. Its login calls still go through the emulated
    // network (data/mockSource); only their results are dropped.
    return state;
  }
  return appReducer(state, action as Exclude<AppActions, StoreAction>);
}
