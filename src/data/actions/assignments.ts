import { ApiError, ContentType } from 'thu-learn-lib';
import { createAction, createAsyncAction } from 'typesafe-actions';
import { dataSource } from 'data/source';
import { dataThunk } from 'data/types/actions';
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  SET_FAV_ASSIGNMENT,
  SET_ARCHIVE_ASSIGNMENTS,
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

export function getAssignmentsForCourse(courseId: string) {
  return dataThunk(async (dispatch, getState) => {
    dispatch(getAssignmentsForCourseAction.request());

    try {
      const results = await dataSource.getHomeworkList(courseId);
      const courseName = getState().courses.names[courseId];
      const assignments = results.map<Assignment>(result => ({
        ...result,
        courseId,
        courseName: courseName.name,
        courseTeacherName: courseName.teacherName,
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
  });
}

export const getAllAssignmentsForCoursesAction = createAsyncAction(
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
)<undefined, Assignment[], ApiError>();

export function getAllAssignmentsForCourses(courseIds: string[]) {
  return dataThunk(async (dispatch, getState) => {
    dispatch(getAllAssignmentsForCoursesAction.request());

    try {
      const results = await dataSource.getAllContents(
        courseIds,
        ContentType.HOMEWORK,
      );
      const courseNames = getState().courses.names;
      const assignments = Object.keys(results).flatMap(courseId => {
        const assignmentsForCourse = results[courseId];
        const courseName = courseNames[courseId];
        return assignmentsForCourse.map<Assignment>(assignment => ({
          ...assignment,
          courseId,
          courseName: courseName.name,
          courseTeacherName: courseName.teacherName,
        }));
      });
      dispatch(
        getAllAssignmentsForCoursesAction.success(sortAssignments(assignments)),
      );
    } catch (err) {
      dispatch(getAllAssignmentsForCoursesAction.failure(serializeError(err)));
    }
  });
}

export const setFavAssignment = createAction(
  SET_FAV_ASSIGNMENT,
  (assignmentId: string, flag: boolean) => ({
    assignmentId,
    flag,
  }),
)();

export const setArchiveAssignments = createAction(
  SET_ARCHIVE_ASSIGNMENTS,
  (assignmentIds: string[], flag: boolean) => ({
    assignmentIds,
    flag,
  }),
)();

export const setPendingAssignmentData = createAction(
  SET_PENDING_ASSIGNMENT_DATA,
  (data: AssignmentsState['pendingAssignmentData']) => data,
)();
