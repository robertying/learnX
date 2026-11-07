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
import { clearCredentials, saveCredentials } from 'data/credentials';
import { queryClient } from 'data/queryClient';
import { userQuery } from 'data/queries';
import { serializeError } from 'helpers/parse';
import { retry } from 'helpers/retry';

export const loginAction = createAsyncAction(
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
)<undefined, undefined, ApiError>();

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

    dispatch(loginAction.request());
    if (username && password && !fingerPrint) {
      await clearCredentials().catch(() => undefined);
    }

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
        // Like redux-persist before it, a failed write keeps the login for
        // this session only.
        await saveCredentials({
          username,
          password,
          fingerPrint,
          fingerGenPrint,
          fingerGenPrint3,
        }).catch(() => undefined);
      }
      dispatch(loginAction.success());
      queryClient.prefetchQuery(userQuery);
    } catch (err) {
      dispatch(loginAction.failure(serializeError(err)));
    }
  };
}

export function loginWithOfflineMode(): ThunkResult {
  return dispatch => {
    dispatch(loginAction.success());
  };
}

export const setSSOInProgress = createAction(
  SET_SSO_IN_PROGRESS,
  (ssoInProgress: boolean) => ({
    ssoInProgress,
  }),
)();
