import { createAction } from 'typesafe-actions';
import { persistor } from 'data/store';
import { clearCredentials } from 'data/credentials';
import { ThunkResult } from 'data/types/actions';
import { CLEAR_STORE, SET_MOCK_STORE } from 'data/types/constants';

export const clearStoreAction = createAction(CLEAR_STORE)();

export function clearStore(): ThunkResult {
  return async dispatch => {
    dispatch(clearStoreAction());
    await Promise.all([clearCredentials(), persistor.purge()]);
    persistor.persist();
  };
}

export const setMockStore = createAction(SET_MOCK_STORE)();
