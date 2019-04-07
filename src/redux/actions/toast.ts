import { createAction } from "typesafe-actions";
import { IThunkResult } from "../types/actions";
import { HIDE_TOAST, SHOW_TOAST } from "../types/constants";

export const showToastAction = createAction(SHOW_TOAST, action => {
  return (text: string) => action(text);
});

export function showToast(text: string, duration: number): IThunkResult {
  return dispatch => {
    dispatch(showToastAction(text));
    setTimeout(() => dispatch(hideToast()), duration);
  };
}

export const hideToast = createAction(HIDE_TOAST);
