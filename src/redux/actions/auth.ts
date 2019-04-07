import { createAsyncAction } from "typesafe-actions";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGOUT_FAILURE,
  LOGOUT_REQUEST,
  LOGOUT_SUCCESS
} from "../types/constants";
import { IAuth } from "../types/state";

export const loginAction = createAsyncAction(
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE
)<undefined, IAuth, Error>();

export function login(username: string, password: string): IThunkResult {
  return async dispatch => {
    dispatch(loginAction.request());
    const success = await dataSource.login(username, password);
    if (success) {
      dispatch(loginAction.success({ username, password }));
    } else {
      dispatch(loginAction.failure(new Error("login failed")));
    }
  };
}

export const logoutAction = createAsyncAction(
  LOGOUT_REQUEST,
  LOGOUT_SUCCESS,
  LOGOUT_FAILURE
)<undefined, undefined, Error>();

export function logout(): IThunkResult {
  return async dispatch => {
    dispatch(logoutAction.request());
    const success = await dataSource.logout();
    if (success) {
      dispatch(logoutAction.success());
    } else {
      dispatch(logoutAction.failure(new Error("logout failed")));
    }
  };
}
