import {createAsyncAction} from 'typesafe-actions';
import {ApiError} from 'thu-learn-lib-no-native/lib/types';
import {dataSource} from 'data/source';
import {ThunkResult} from 'data/types/actions';
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
} from 'data/types/constants';
import {Auth} from 'data/types/state';
import {getUserInfo} from './user';
import {serializeError} from 'helpers/parse';

export const loginAction = createAsyncAction(
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
)<undefined, Auth, ApiError>();

export function login(username?: string, password?: string): ThunkResult {
  return async (dispatch, getState) => {
    dispatch(loginAction.request());

    const auth = getState().auth;
    const _username = username || auth.username || '';
    const _password = password || auth.password || '';

    try {
      await dataSource.login(_username, _password);
      dispatch(loginAction.success({username: _username, password: _password}));

      dispatch(getUserInfo());
    } catch (err) {
      dispatch(loginAction.failure(serializeError(err)));
    }
  };
}
