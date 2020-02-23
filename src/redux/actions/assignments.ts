import {ContentType, Homework} from 'thu-learn-lib-no-native/lib/types';
import {createAction, createAsyncAction} from 'typesafe-actions';
import {dataSource} from '../dataSource';
import {IThunkResult} from '../types/actions';
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  PIN_ASSIGNMENT,
  UNPIN_ASSIGNMENT,
  FAV_ASSIGNMENT,
  UNFAV_ASSIGNMENT,
  UNREAD_ASSIGNMENT,
  READ_ASSIGNMENT,
} from '../types/constants';
import {IAssignment} from '../types/state';

export const getAssignmentsForCourseAction = createAsyncAction(
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
)<
  undefined,
  {
    courseId: string;
    assignments: IAssignment[];
  },
  Error
>();

export function getAssignmentsForCourse(courseId: string): IThunkResult {
  return async dispatch => {
    dispatch(getAssignmentsForCourseAction.request());

    try {
      const results = await dataSource.getHomeworkList(courseId);
      const assignments = results.map(result => ({
        ...result,
        courseId,
      }));
      dispatch(getAssignmentsForCourseAction.success({courseId, assignments}));
    } catch (err) {
      dispatch(getAssignmentsForCourseAction.failure(new Error(err)));
    }
  };
}

export const getAllAssignmentsForCoursesAction = createAsyncAction(
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
)<undefined, IAssignment[], Error>();

export function getAllAssignmentsForCourses(courseIds: string[]): IThunkResult {
  return async dispatch => {
    dispatch(getAllAssignmentsForCoursesAction.request());

    try {
      const results = await dataSource.getAllContents(
        courseIds,
        ContentType.HOMEWORK,
      );
      const assignments = Object.keys(results)
        .map(courseId => {
          const assignmentsForCourse = results[courseId] as Homework[];
          return assignmentsForCourse.map(assignment => ({
            ...assignment,
            courseId,
          }));
        })
        .reduce((a, b) => a.concat(b));
      dispatch(getAllAssignmentsForCoursesAction.success(assignments));
    } catch (err) {
      dispatch(getAllAssignmentsForCoursesAction.failure(new Error(err)));
    }
  };
}

export const pinAssignment = createAction(
  PIN_ASSIGNMENT,
  (assignmentId: string) => assignmentId,
)();

export const unpinAssignment = createAction(
  UNPIN_ASSIGNMENT,
  (assignmentId: string) => assignmentId,
)();

export const favAssignment = createAction(
  FAV_ASSIGNMENT,
  (assignmentId: string) => assignmentId,
)();

export const unfavAssignment = createAction(
  UNFAV_ASSIGNMENT,
  (assignmentId: string) => assignmentId,
)();

export const readAssignment = createAction(
  READ_ASSIGNMENT,
  (assignmentId: string) => assignmentId,
)();

export const unreadAssignment = createAction(
  UNREAD_ASSIGNMENT,
  (assignmentId: string) => assignmentId,
)();
