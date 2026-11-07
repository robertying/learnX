import { ApiError, ContentType } from 'thu-learn-lib';
import { createAction, createAsyncAction } from 'typesafe-actions';
import { getCourseNames } from 'data/queries';
import { dataSource } from 'data/source';
import { ThunkResult } from 'data/types/actions';
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  SET_PENDING_ASSIGNMENT_DATA,
} from 'data/types/constants';
import { Assignment, AssignmentsState } from 'data/types/state';
import { sortAssignments } from 'helpers/assignments';
import { serializeError } from 'helpers/parse';

export const getAssignmentsForCourseAction = createAsyncAction(
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
)<
  undefined,
  {
    courseId: string;
    assignments: Assignment[];
  },
  ApiError
>();

export function getAssignmentsForCourse(courseId: string): ThunkResult {
  return async dispatch => {
    dispatch(getAssignmentsForCourseAction.request());

    try {
      const results = await dataSource.getHomeworkList(courseId);
      const assignments = results.map<Assignment>(result => ({
        ...result,
        courseId,
        ...getCourseNames(courseId),
      }));
      dispatch(
        getAssignmentsForCourseAction.success({
          courseId,
          assignments,
        }),
      );
    } catch (err) {
      dispatch(getAssignmentsForCourseAction.failure(serializeError(err)));
    }
  };
}

export const getAllAssignmentsForCoursesAction = createAsyncAction(
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
)<undefined, Assignment[], ApiError>();

export function getAllAssignmentsForCourses(courseIds: string[]): ThunkResult {
  return async dispatch => {
    dispatch(getAllAssignmentsForCoursesAction.request());

    try {
      const results = await dataSource.getAllContents(
        courseIds,
        ContentType.HOMEWORK,
      );
      const assignments = Object.keys(results).flatMap(courseId => {
        const assignmentsForCourse = results[courseId];
        return assignmentsForCourse.map<Assignment>(assignment => ({
          ...assignment,
          courseId,
          ...getCourseNames(courseId),
        }));
      });
      dispatch(
        getAllAssignmentsForCoursesAction.success(sortAssignments(assignments)),
      );
    } catch (err) {
      dispatch(getAllAssignmentsForCoursesAction.failure(serializeError(err)));
    }
  };
}

export const setPendingAssignmentData = createAction(
  SET_PENDING_ASSIGNMENT_DATA,
  (data: AssignmentsState['pendingAssignmentData']) => data,
)();
