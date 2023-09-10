import {ApiError} from 'thu-learn-lib-no-native/lib/types';
import {createAction, createAsyncAction} from 'typesafe-actions';
import {dataSource} from 'data/source';
import {ThunkResult} from 'data/types/actions';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  SET_HIDE_COURSE,
} from 'data/types/constants';
import {Course} from 'data/types/state';
import {getLocale} from 'helpers/i18n';

export const getCoursesForSemesterAction = createAsyncAction(
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  GET_COURSES_FOR_SEMESTER_FAILURE,
)<undefined, Course[], ApiError>();

export function getCoursesForSemester(semesterId: string): ThunkResult {
  return async dispatch => {
    dispatch(getCoursesForSemesterAction.request());

    const lang = getLocale().startsWith('zh') ? 'zh' : 'en';

    try {
      const results = await dataSource.getCourseList(
        semesterId,
        undefined,
        lang,
      );
      const courses = results
        .map(course => ({...course, semesterId}))
        .sort((a, b) => a.id.localeCompare(b.id));
      dispatch(getCoursesForSemesterAction.success(courses));
    } catch (err) {
      dispatch(getCoursesForSemesterAction.failure(err as ApiError));
    }
  };
}

export const setHideCourse = createAction(
  SET_HIDE_COURSE,
  (courseId: string, flag: boolean) => ({courseId, flag}),
)();
