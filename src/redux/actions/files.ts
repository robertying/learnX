import {ContentType, File, CourseType} from 'thu-learn-lib-no-native/lib/types';
import {createAction, createAsyncAction} from 'typesafe-actions';
import {dataSource} from '../dataSource';
import {IThunkResult} from '../types/actions';
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  PIN_FILE,
  UNPIN_FILE,
  FAV_FILE,
  UNFAV_FILE,
} from '../types/constants';
import {IFile} from '../types/state';

export const getFilesForCourseAction = createAsyncAction(
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
)<undefined, {courseId: string; files: IFile[]}, Error>();

export function getFilesForCourse(courseId: string): IThunkResult {
  return async dispatch => {
    dispatch(getFilesForCourseAction.request());

    const results = await dataSource.getFileList(courseId, CourseType.STUDENT);

    if (results) {
      const files = results.map(result => ({...result, courseId}));
      dispatch(getFilesForCourseAction.success({files, courseId}));
    } else {
      dispatch(
        getFilesForCourseAction.failure(new Error('getFilesForCourse failed')),
      );
    }
  };
}

export const getAllFilesForCoursesAction = createAsyncAction(
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_ALL_FILES_FOR_COURSES_FAILURE,
)<undefined, IFile[], Error>();

export function getAllFilesForCourses(courseIds: string[]): IThunkResult {
  return async dispatch => {
    dispatch(getAllFilesForCoursesAction.request());

    const results = await dataSource.getAllContents(
      courseIds,
      ContentType.FILE,
    );

    if (results) {
      const files = Object.keys(results)
        .map(courseId => {
          const filesForCourse = results[courseId] as File[];
          return filesForCourse.map(file => ({...file, courseId}));
        })
        .reduce((a, b) => a.concat(b));
      dispatch(getAllFilesForCoursesAction.success(files));
    } else {
      dispatch(
        getAllFilesForCoursesAction.failure(
          new Error('getAllFilesForCourses failed'),
        ),
      );
    }
  };
}

export const pinFile = createAction(PIN_FILE, (fileId: string) => fileId)();

export const unpinFile = createAction(UNPIN_FILE, (fileId: string) => fileId)();

export const favFile = createAction(FAV_FILE, (fileId: string) => fileId)();

export const unfavFile = createAction(UNFAV_FILE, (fileId: string) => fileId)();
