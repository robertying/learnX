import {createAction} from 'typesafe-actions';
import {persistor} from '../store';
import {IThunkResult} from '../types/actions';
import {CLEAR_STORE, SET_MOCK_STORE, RESET_LOADING} from '../types/constants';

export const resetLoading = createAction(RESET_LOADING)();

export const clearStoreAction = createAction(CLEAR_STORE)();

export function clearStore(): IThunkResult {
  return async (dispatch) => {
    dispatch(clearStoreAction());
    await persistor.purge();
    persistor.persist();
  };
}

export const setMockStore = createAction(SET_MOCK_STORE)();
