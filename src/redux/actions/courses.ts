import { createAction, createAsyncAction } from "typesafe-actions";
import { getTranslation } from "../../helpers/i18n";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  PIN_COURSE,
  SET_COURSES_FILTER,
  UNPIN_COURSE
} from "../types/constants";
import { ICourse } from "../types/state";
import { login } from "./auth";
import { showToast } from "./toast";

export const getCoursesForSemesterAction = createAsyncAction(
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  GET_COURSES_FOR_SEMESTER_FAILURE
)<undefined, ReadonlyArray<ICourse>, Error>();

export function getCoursesForSemester(semesterId: string): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getCoursesForSemesterAction.request());

    const courses = await dataSource.getCourseList(semesterId).catch(err => {
      dispatch(showToast(getTranslation("refreshFailure"), 1500));
      const auth = getState().auth;
      dispatch(login(auth.username || "", auth.password || ""));
    });

    if (courses) {
      dispatch(getCoursesForSemesterAction.success(courses));
    } else {
      dispatch(
        getCoursesForSemesterAction.failure(
          new Error("getCoursesForSemester failed")
        )
      );
    }
  };
}

export const pinCourse = createAction(PIN_COURSE, action => {
  return (courseId: string) => action(courseId);
});

export const unpinCourse = createAction(UNPIN_COURSE, action => {
  return (courseId: string) => action(courseId);
});

export const setCoursesFilter = createAction(SET_COURSES_FILTER, action => {
  return (hiddenCourses: readonly string[]) => action(hiddenCourses);
});
