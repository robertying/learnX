import {createAsyncAction} from 'typesafe-actions';
import {CourseType} from 'thu-learn-lib-no-native/lib/types';
import {
  GET_USER_INFO_FAILURE,
  GET_USER_INFO_REQUEST,
  GET_USER_INFO_SUCCESS,
} from 'data/types/constants';
import {User} from 'data/types/state';
import {ThunkResult} from 'data/types/actions';
import {dataSource} from 'data/source';

export const getUserInfoAction = createAsyncAction(
  GET_USER_INFO_REQUEST,
  GET_USER_INFO_SUCCESS,
  GET_USER_INFO_FAILURE,
)<undefined, User, Error>();

export function getUserInfo(): ThunkResult {
  return async dispatch => {
    dispatch(getUserInfoAction.request());

    try {
      const userInfo = await dataSource.getUserInfo(CourseType.STUDENT);
      dispatch(getUserInfoAction.success(userInfo));
    } catch (err) {
      dispatch(getUserInfoAction.failure(err));
    }
  };
}
