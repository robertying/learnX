import { createAsyncAction } from "typesafe-actions";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS
} from "../types/constants";
import { ICourse } from "../types/state";

export const getCoursesForSemesterAction = createAsyncAction(
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  GET_COURSES_FOR_SEMESTER_FAILURE
)<undefined, ReadonlyArray<ICourse>, Error>();

export function getCoursesForSemester(semesterId: string): IThunkResult {
  return async dispatch => {
    dispatch(getCoursesForSemesterAction.request());
    const courses = await dataSource.getCourseList(semesterId);
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
