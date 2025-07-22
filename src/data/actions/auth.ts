import { createAction, createAsyncAction } from 'typesafe-actions';
import { ApiError } from 'thu-learn-lib';
import { loginWithFingerPrint, resetDataSource } from 'data/source';
import { ThunkResult } from 'data/types/actions';
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  SET_SSO_IN_PROGRESS,
} from 'data/types/constants';
import { Auth } from 'data/types/state';
import { getUserInfo } from './user';
import { serializeError } from 'helpers/parse';
import { retry } from 'helpers/retry';

export const loginAction = createAsyncAction(
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
)<{ clearCredential?: boolean }, Auth | undefined, ApiError>();

export function login({
  username,
  password,
  fingerPrint,
  fingerGenPrint = '',
  fingerGenPrint3 = '',
  reset = false,
}: {
  username?: string;
  password?: string;
  fingerPrint?: string;
  fingerGenPrint?: string;
  fingerGenPrint3?: string;
  reset?: boolean;
}): ThunkResult {
  return async (dispatch, getState) => {
    if (!username || !password || !fingerPrint) {
      const { auth } = getState();
      if (auth.loggingIn) {
        return;
      }
    }

    dispatch(
      loginAction.request({
        clearCredential: !!username && !!password && !fingerPrint,
      }),
    );

    try {
      if (reset) {
        resetDataSource();
      }

      await retry(async () => {
        await loginWithFingerPrint(
          username,
          password,
          fingerPrint,
          fingerGenPrint,
          fingerGenPrint3,
        );
      });

      if (username && password && fingerPrint) {
        dispatch(
          loginAction.success({
            username,
            password,
            fingerPrint,
            fingerGenPrint,
            fingerGenPrint3,
          }),
        );
      } else {
        dispatch(loginAction.success(undefined));
      }
      dispatch(getUserInfo());
    } catch (err) {
      dispatch(loginAction.failure(serializeError(err)));
    }
  };
}

export function loginWithOfflineMode(): ThunkResult {
  return dispatch => {
    dispatch(loginAction.success(undefined));
  };
}

export const setSSOInProgress = createAction(
  SET_SSO_IN_PROGRESS,
  (ssoInProgress: boolean) => ({
    ssoInProgress,
  }),
)();
