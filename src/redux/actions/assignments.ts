import { ContentType } from "thu-learn-lib-no-native/lib/types";
import { createAction, createAsyncAction } from "typesafe-actions";
import { saveAssignmentsToCalendar } from "../../helpers/calendar";
import dayjs from "../../helpers/dayjs";
import { getTranslation } from "../../helpers/i18n";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  PIN_ASSIGNMENT,
  UNPIN_ASSIGNMENT
} from "../types/constants";
import { IAssignment } from "../types/state";
import { login } from "./auth";
import { showToast } from "./toast";

export const getAssignmentsForCourseAction = createAsyncAction(
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE
)<
  undefined,
  {
    readonly assignments: ReadonlyArray<IAssignment>;
    readonly courseId: string;
  },
  Error
>();

export function getAssignmentsForCourse(courseId: string): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getAssignmentsForCourseAction.request());

    const results = await dataSource.getHomeworkList(courseId).catch(err => {
      dispatch(showToast(getTranslation("refreshFailure"), 1500));
      const auth = getState().auth;
      dispatch(login(auth.username || "", auth.password || ""));
    });

    if (results) {
      const assignments = results.map(result => ({ ...result, courseId }));
      dispatch(
        getAssignmentsForCourseAction.success({ assignments, courseId })
      );
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
  return async (dispatch, getState) => {
    dispatch(getAllAssignmentsForCoursesAction.request());

    const results = await dataSource
      .getAllContents(courseIds, ContentType.HOMEWORK)
      .catch(err => {
        dispatch(showToast(getTranslation("refreshFailure"), 1500));
        const auth = getState().auth;
        dispatch(login(auth.username || "", auth.password || ""));
      });

    if (results) {
      const assignments = Object.keys(results)
        .map(courseId => {
          const assignmentsForCourse = results[courseId] as any;
          return assignmentsForCourse.map((assignment: IAssignment) => ({
            ...assignment,
            courseId
          }));
        })
        .reduce((a, b) => a.concat(b));
      dispatch(getAllAssignmentsForCoursesAction.success(assignments));

      if (getState().settings.calendarSync) {
        const savingAssignments: readonly IAssignment[] = [
          ...assignments
        ].filter(item => dayjs(item.deadline).isAfter(dayjs()));
        saveAssignmentsToCalendar(savingAssignments);
      }
    } else {
      dispatch(
        getAllAssignmentsForCoursesAction.failure(
          new Error("getAllAssignmentsForCourses failed")
        )
      );
    }
  };
}

export const pinAssignment = createAction(PIN_ASSIGNMENT, action => {
  return (assignmentId: string) => action(assignmentId);
});

export const unpinAssignment = createAction(UNPIN_ASSIGNMENT, action => {
  return (assignmentId: string) => action(assignmentId);
});
