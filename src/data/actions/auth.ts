import { createAsyncAction } from 'typesafe-actions';
import { ApiError } from 'thu-learn-lib';
import { dataSource, resetDataSource } from 'data/source';
import { ThunkResult } from 'data/types/actions';
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
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

export function login(
  username?: string,
  password?: string,
  reset?: boolean,
): ThunkResult {
  return async (dispatch, getState) => {
    if (!username || !password) {
      const { auth } = getState();
      if (auth.loggingIn) {
        return;
      }
    }

    dispatch(
      loginAction.request({ clearCredential: !!username && !!password }),
    );

    try {
      if (reset) {
        resetDataSource();
      }

      await retry(async () => {
        await dataSource.login(username, password);
      });

      if (username && password) {
        dispatch(
          loginAction.success({
            username,
            password,
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
