import {createAction} from 'typesafe-actions';
import {persistor} from 'data/store';
import {ThunkResult} from 'data/types/actions';
import {CLEAR_STORE, SET_MOCK_STORE, RESET_LOADING} from 'data/types/constants';

export const resetLoading = createAction(RESET_LOADING)();

export const clearStoreAction = createAction(CLEAR_STORE)();

export function clearStore(): ThunkResult {
  return async dispatch => {
    dispatch(clearStoreAction());
    await persistor.purge();
    persistor.persist();
  };
}

export const setMockStore = createAction(SET_MOCK_STORE)();
