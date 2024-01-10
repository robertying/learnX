import {createAsyncAction} from 'typesafe-actions';
import {ApiError} from 'thu-learn-lib';
import {dataSource, resetDataSource} from 'data/source';
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
)<undefined, Auth | undefined, ApiError>();

export function login(username?: string, password?: string): ThunkResult {
  return async dispatch => {
    dispatch(loginAction.request());

    try {
      if (username && password) {
        resetDataSource();
      }

      await dataSource.login(username, password);

      if (username && password) {
        dispatch(
          loginAction.success({
            username,
            password,
          }),
        );
        dispatch(getUserInfo());
      } else {
        dispatch(loginAction.success(undefined));
      }
    } catch (err) {
      dispatch(loginAction.failure(serializeError(err)));
    }
  };
}
