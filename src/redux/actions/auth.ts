import {createAsyncAction} from 'typesafe-actions';
import {dataSource} from '../dataSource';
import {IThunkResult} from '../types/actions';
import {LOGIN_FAILURE, LOGIN_REQUEST, LOGIN_SUCCESS} from '../types/constants';
import {IAuth} from '../types/state';

export const loginAction = createAsyncAction(
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
)<undefined, IAuth, Error>();

export function login(username?: string, password?: string): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(loginAction.request());

    const auth = getState().auth;
    const _username = username || auth.username || '';
    const _password = password || auth.password || '';
    try {
      await dataSource.login(_username, _password);
      dispatch(loginAction.success({username: _username, password: _password}));
    } catch (err) {
      dispatch(loginAction.failure(err));
    }
  };
}
