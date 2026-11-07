import { createAction } from 'typesafe-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistor } from 'data/store';
import { clearCredentials } from 'data/credentials';
import { LEGACY_SETTINGS_KEY } from 'data/legacy';
import { resetSettings } from 'data/settings';
import { resetUserData } from 'data/userData';
import { ThunkResult } from 'data/types/actions';
import { CLEAR_STORE, SET_MOCK_STORE } from 'data/types/constants';

export const clearStoreAction = createAction(CLEAR_STORE)();

/** Logs out: forgets the login, the server data and the user's own data. */
export function clearStore(): ThunkResult {
  return async dispatch => {
    dispatch(clearStoreAction());
    resetSettings();
    resetUserData();
    await Promise.all([
      clearCredentials(),
      persistor.purge(),
      // Only left behind if the one-time import failed; it must not come back
      // after logging out.
      AsyncStorage.removeItem(LEGACY_SETTINGS_KEY),
    ]);
    persistor.persist();
  };
}

export const setMockStoreAction = createAction(SET_MOCK_STORE)();

/** Loads the mock account's data, replacing whatever was there. */
export function setMockStore(): ThunkResult {
  return dispatch => {
    const { mockUserData } = require('data/mock') as typeof import('data/mock');
    resetSettings();
    resetUserData(mockUserData);
    dispatch(setMockStoreAction());
  };
}
