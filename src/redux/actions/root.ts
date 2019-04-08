import { createAction } from "typesafe-actions";
import { persistor } from "../store";
import { IThunkResult } from "../types/actions";
import { CLEAR_STORE, SET_MOCK_STORE } from "../types/constants";

export const clearStoreAction = createAction(CLEAR_STORE);

export function clearStore(): IThunkResult {
  return dispatch => {
    dispatch(clearStoreAction());
    persistor.purge();
  };
}

export const setMockStore = createAction(SET_MOCK_STORE);
