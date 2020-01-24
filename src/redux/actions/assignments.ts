import {ContentType, Homework} from 'thu-learn-lib-no-native/lib/types';
import {createAction, createAsyncAction} from 'typesafe-actions';
import {saveAssignmentsToCalendar} from '../../helpers/calendar';
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

    const results = await dataSource.getHomeworkList(courseId);

    if (results) {
      const assignments = results.map(result => ({
        ...result,
        courseId,
        description: result.description
          ? result.description.startsWith('\xC2\x9E\xC3\xA9\x65')
            ? result.description.substr(5)
            : result.description.startsWith('\x9E\xE9\x65')
            ? result.description.substr(3)
            : result.description
          : '',
      }));
      dispatch(getAssignmentsForCourseAction.success({courseId, assignments}));
    } else {
      dispatch(
        getAssignmentsForCourseAction.failure(
          new Error('getAssignmentsForCourse failed'),
        ),
      );
    }
  };
}

export const getAllAssignmentsForCoursesAction = createAsyncAction(
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
)<undefined, IAssignment[], Error>();

export function getAllAssignmentsForCourses(courseIds: string[]): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getAllAssignmentsForCoursesAction.request());

    const results = await dataSource.getAllContents(
      courseIds,
      ContentType.HOMEWORK,
    );

    if (results) {
      const assignments = Object.keys(results)
        .map(courseId => {
          const assignmentsForCourse = results[courseId] as Homework[];
          return assignmentsForCourse.map(assignment => ({
            ...assignment,
            courseId,
            description: assignment.description
              ? assignment.description.startsWith('\xC2\x9E\xC3\xA9\x65')
                ? assignment.description.substr(5)
                : assignment.description.startsWith('\x9E\xE9\x65')
                ? assignment.description.substr(3)
                : assignment.description
              : '',
          }));
        })
        .reduce((a, b) => a.concat(b));
      dispatch(getAllAssignmentsForCoursesAction.success(assignments));

      if (getState().settings.calendarSync) {
        saveAssignmentsToCalendar(assignments);
      }
    } else {
      dispatch(
        getAllAssignmentsForCoursesAction.failure(
          new Error('getAllAssignmentsForCourses failed'),
        ),
      );
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
