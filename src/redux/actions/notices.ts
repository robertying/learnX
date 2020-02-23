import {ContentType, Notification} from 'thu-learn-lib-no-native/lib/types';
import {createAction, createAsyncAction} from 'typesafe-actions';
import {dataSource} from '../dataSource';
import {IThunkResult} from '../types/actions';
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  PIN_NOTICE,
  UNPIN_NOTICE,
  FAV_NOTICE,
  UNFAV_NOTICE,
  UNREAD_NOTICE,
  READ_NOTICE,
} from '../types/constants';
import {INotice} from '../types/state';

export const getNoticesForCourseAction = createAsyncAction(
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
)<undefined, {courseId: string; notices: INotice[]}, Error>();

export function getNoticesForCourse(courseId: string): IThunkResult {
  return async dispatch => {
    dispatch(getNoticesForCourseAction.request());

    try {
      const results = await dataSource.getNotificationList(courseId);
      const notices = results.map(result => ({
        ...result,
        courseId,
      }));
      dispatch(getNoticesForCourseAction.success({notices, courseId}));
    } catch (err) {
      dispatch(getNoticesForCourseAction.failure(new Error(err)));
    }
  };
}

export const getAllNoticesForCoursesAction = createAsyncAction(
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
)<undefined, INotice[], Error>();

export function getAllNoticesForCourses(courseIds: string[]): IThunkResult {
  return async dispatch => {
    dispatch(getAllNoticesForCoursesAction.request());

    try {
      const results = await dataSource.getAllContents(
        courseIds,
        ContentType.NOTIFICATION,
      );
      const notices = Object.keys(results)
        .map(courseId => {
          const noticesForCourse = results[courseId] as Notification[];
          return noticesForCourse.map(notice => ({
            ...notice,
            courseId,
          }));
        })
        .reduce((a, b) => a.concat(b));
      dispatch(getAllNoticesForCoursesAction.success(notices));
    } catch (err) {
      dispatch(getAllNoticesForCoursesAction.failure(new Error(err)));
    }
  };
}

export const pinNotice = createAction(
  PIN_NOTICE,
  (noticeId: string) => noticeId,
)();

export const unpinNotice = createAction(
  UNPIN_NOTICE,
  (noticeId: string) => noticeId,
)();

export const favNotice = createAction(
  FAV_NOTICE,
  (noticeId: string) => noticeId,
)();

export const unfavNotice = createAction(
  UNFAV_NOTICE,
  (noticeId: string) => noticeId,
)();

export const readNotice = createAction(
  READ_NOTICE,
  (noticeId: string) => noticeId,
)();

export const unreadNotice = createAction(
  UNREAD_NOTICE,
  (noticeId: string) => noticeId,
)();
