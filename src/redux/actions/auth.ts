import {createAsyncAction, createAction} from 'typesafe-actions';
import {dataSource} from '../dataSource';
import {IThunkResult} from '../types/actions';
import {
  LOGIN_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  SET_FIREBASE_AUTH,
} from '../types/constants';
import {IAuth, IFirebaseAuth} from '../types/state';

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
      dispatch(loginAction.failure(new Error(err)));
    }
  };
}

export const setFirebaseAuth = createAction(
  SET_FIREBASE_AUTH,
  (firebaseAuth?: IFirebaseAuth) => firebaseAuth,
)();
