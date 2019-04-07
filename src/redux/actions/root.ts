import { createAction } from "typesafe-actions";
import { persistor } from "../store";
import { IThunkResult } from "../types/actions";
import { CLEAR_STORE } from "../types/constants";
import { logout } from "./auth";

export const clearStoreAction = createAction(CLEAR_STORE);

export function clearStore(): IThunkResult {
  return dispatch => {
    dispatch(logout());
    return () => persistor.purge();
  };
}
