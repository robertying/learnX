import {ApiError, CourseType, Language} from 'thu-learn-lib';
import {createAction, createAsyncAction} from 'typesafe-actions';
import {dataSource} from 'data/source';
import {ThunkResult} from 'data/types/actions';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  SET_HIDE_COURSE,
  SET_COURSE_ORDER,
} from 'data/types/constants';
import {Course} from 'data/types/state';
import {isLocaleChinese} from 'helpers/i18n';
import {serializeError} from 'helpers/parse';

export const getCoursesForSemesterAction = createAsyncAction(
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  GET_COURSES_FOR_SEMESTER_FAILURE,
)<undefined, Course[], ApiError>();

export function getCoursesForSemester(semesterId: string): ThunkResult {
  return async dispatch => {
    dispatch(getCoursesForSemesterAction.request());

    const lang = isLocaleChinese() ? Language.ZH : Language.EN;

    try {
      await dataSource.setLanguage(lang);
    } catch (err) {}

    try {
      const results = await dataSource.getCourseList(
        semesterId,
        CourseType.STUDENT,
        lang,
      );
      const courses = results
        .map(course => ({...course, semesterId}))
        .sort((a, b) => a.id.localeCompare(b.id));
      dispatch(getCoursesForSemesterAction.success(courses));
    } catch (err) {
      dispatch(getCoursesForSemesterAction.failure(serializeError(err)));
    }
  };
}

export const setHideCourse = createAction(
  SET_HIDE_COURSE,
  (courseId: string, flag: boolean) => ({courseId, flag}),
)();

export const setCourseOrder = createAction(
  SET_COURSE_ORDER,
  (courseIds: string[]) => courseIds,
)();
