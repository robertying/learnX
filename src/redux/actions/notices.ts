import { ContentType } from "thu-learn-lib-no-native/lib/types";
import { createAsyncAction } from "typesafe-actions";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS
} from "../types/constants";
import { INotice } from "../types/state";
import { login } from "./auth";
import { showToast } from "./toast";

export const getNoticesForCourseAction = createAsyncAction(
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE
)<undefined, ReadonlyArray<INotice>, Error>();

export function getNoticesForCourse(courseId: string): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getNoticesForCourseAction.request());

    const results = await dataSource
      .getNotificationList(courseId)
      .catch(err => {
        dispatch(showToast("刷新失败，您可能未登录", 1500));
        const auth = getState().auth;
        dispatch(login(auth.username || "", auth.password || ""));
      });

    if (results) {
      const notices = results.map(result => ({ ...result, courseId }));
      dispatch(getNoticesForCourseAction.success(notices));
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
  return async dispatch => {
    dispatch(getAllNoticesForCoursesAction.request());
    const results = await dataSource.getAllContents(
      courseIds,
      ContentType.NOTIFICATION
    );
    const notices = Object.keys(results)
      .map(courseId => {
        const noticesForCourse = results[courseId] as any;
        return noticesForCourse.map((notice: INotice) => ({
          ...notice,
          courseId
        }));
      })
      .reduce((a, b) => a.concat(b));
    if (notices) {
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
