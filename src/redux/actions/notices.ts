import { ContentType } from "thu-learn-lib-no-native/lib/types";
import { createAction, createAsyncAction } from "typesafe-actions";
import { getTranslation } from "../../helpers/i18n";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  PIN_NOTICE,
  UNPIN_NOTICE
} from "../types/constants";
import { INotice } from "../types/state";
import { login } from "./auth";
import { showToast } from "./toast";

export const getNoticesForCourseAction = createAsyncAction(
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE
)<
  undefined,
  { readonly notices: ReadonlyArray<INotice>; readonly courseId: string },
  Error
>();

export function getNoticesForCourse(courseId: string): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getNoticesForCourseAction.request());

    const results = await dataSource
      .getNotificationList(courseId)
      .catch(err => {
        dispatch(showToast(getTranslation("refreshFailure"), 1500));
        const auth = getState().auth;
        dispatch(login(auth.username || "", auth.password || ""));
      });

    if (results) {
      const notices = results.map(result => ({ ...result, courseId }));
      dispatch(getNoticesForCourseAction.success({ notices, courseId }));
    } else {
      dispatch(
        getNoticesForCourseAction.failure(
          new Error("getNoticesForCourse failed")
        )
      );
    }
  };
}

export const getAllNoticesForCoursesAction = createAsyncAction(
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_ALL_NOTICES_FOR_COURSES_FAILURE
)<undefined, ReadonlyArray<INotice>, Error>();

export function getAllNoticesForCourses(
  // tslint:disable-next-line: readonly-array
  courseIds: string[]
): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getAllNoticesForCoursesAction.request());

    const results = await dataSource
      .getAllContents(courseIds, ContentType.NOTIFICATION)
      .catch(err => {
        dispatch(showToast(getTranslation("refreshFailure"), 1500));
        const auth = getState().auth;
        dispatch(login(auth.username || "", auth.password || ""));
      });

    if (results) {
      const notices = Object.keys(results)
        .map(courseId => {
          const noticesForCourse = results[courseId] as any;
          return noticesForCourse.map((notice: INotice) => ({
            ...notice,
            courseId
          }));
        })
        .reduce((a, b) => a.concat(b));
      dispatch(getAllNoticesForCoursesAction.success(notices));
    } else {
      dispatch(
        getAllNoticesForCoursesAction.failure(
          new Error("getAllNoticesForCourses failed")
        )
      );
    }
  };
}

export const pinNotice = createAction(PIN_NOTICE, action => {
  return (noticeId: string) => action(noticeId);
});

export const unpinNotice = createAction(UNPIN_NOTICE, action => {
  return (noticeId: string) => action(noticeId);
});
