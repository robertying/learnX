import {createAsyncAction} from 'typesafe-actions';
import {CourseType, Language} from 'thu-learn-lib';
import {
  GET_USER_INFO_FAILURE,
  GET_USER_INFO_REQUEST,
  GET_USER_INFO_SUCCESS,
} from 'data/types/constants';
import {User} from 'data/types/state';
import {ThunkResult} from 'data/types/actions';
import {dataSource} from 'data/source';
import {isLocaleChinese} from 'helpers/i18n';

export const getUserInfoAction = createAsyncAction(
  GET_USER_INFO_REQUEST,
  GET_USER_INFO_SUCCESS,
  GET_USER_INFO_FAILURE,
)<undefined, User, Error>();

export function getUserInfo(): ThunkResult {
  return async dispatch => {
    dispatch(getUserInfoAction.request());

    const lang = isLocaleChinese() ? Language.ZH : Language.EN;

    try {
      await dataSource.setLanguage(lang);
    } catch (err) {}

    try {
      const userInfo = await dataSource.getUserInfo(CourseType.STUDENT);
      dispatch(getUserInfoAction.success(userInfo));
    } catch (err) {
      dispatch(getUserInfoAction.failure(err as Error));
    }
  };
}
