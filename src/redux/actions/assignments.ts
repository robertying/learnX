import { ContentType } from "thu-learn-lib-no-native/lib/types";
import { createAsyncAction } from "typesafe-actions";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS
} from "../types/constants";
import { IAssignment } from "../types/state";

export const getAssignmentsForCourseAction = createAsyncAction(
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE
)<undefined, ReadonlyArray<IAssignment>, Error>();

export function getAssignmentsForCourse(courseId: string): IThunkResult {
  return async dispatch => {
    dispatch(getAssignmentsForCourseAction.request());
    const results = await dataSource.getHomeworkList(courseId);
    const assignments = results.map(result => ({ ...result, courseId }));
    if (assignments) {
      dispatch(getAssignmentsForCourseAction.success(assignments));
    } else {
      dispatch(
        getAssignmentsForCourseAction.failure(
          new Error("getAssignmentsForCourse failed")
        )
      );
    }
  };
}

export const getAllAssignmentsForCoursesAction = createAsyncAction(
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE
)<undefined, ReadonlyArray<IAssignment>, Error>();

export function getAllAssignmentsForCourses(
  // tslint:disable-next-line: readonly-array
  courseIds: string[]
): IThunkResult {
  return async dispatch => {
    dispatch(getAllAssignmentsForCoursesAction.request());
    const results = await dataSource.getAllContents(
      courseIds,
      ContentType.HOMEWORK
    );
    const assignments = Object.keys(results)
      .map(courseId => {
        const assignmentsForCourse = results[courseId] as any;
        return assignmentsForCourse.map((assignment: IAssignment) => ({
          ...assignment,
          courseId
        }));
      })
      .reduce((a, b) => a.concat(b));
    if (assignments) {
      dispatch(getAllAssignmentsForCoursesAction.success(assignments));
    } else {
      dispatch(
        getAllAssignmentsForCoursesAction.failure(
          new Error("getAllAssignmentsForCourses failed")
        )
      );
    }
  };
}
