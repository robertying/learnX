import {
  ContentType,
  File as IFile,
  CourseType,
  ApiError,
} from 'thu-learn-lib-no-native/lib/types';
import {createAction, createAsyncAction} from 'typesafe-actions';
import dayjs from 'dayjs';
import {dataSource} from 'data/source';
import {ThunkResult} from 'data/types/actions';
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  SET_PIN_FILE,
  SET_FAV_FILE,
  SET_UNREAD_FILE,
  SET_ARCHIVE_FILES,
} from 'data/types/constants';
import {File} from 'data/types/state';

export const getFilesForCourseAction = createAsyncAction(
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
)<undefined, {courseId: string; files: File[]}, ApiError>();

export function getFilesForCourse(courseId: string): ThunkResult {
  return async (dispatch, getState) => {
    dispatch(getFilesForCourseAction.request());

    try {
      const results = await dataSource.getFileList(
        courseId,
        CourseType.STUDENT,
      );
      const courseName = getState().courses.names[courseId];
      const files = results
        .map<File>((result) => ({
          ...result,
          courseId,
          courseName: courseName.name,
          courseTeacherName: courseName.teacherName,
        }))
        .sort(
          (a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix(),
        );
      dispatch(getFilesForCourseAction.success({files, courseId}));
    } catch (err) {
      dispatch(getFilesForCourseAction.failure(err));
    }
  };
}

export const getAllFilesForCoursesAction = createAsyncAction(
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_ALL_FILES_FOR_COURSES_FAILURE,
)<undefined, File[], ApiError>();

export function getAllFilesForCourses(courseIds: string[]): ThunkResult {
  return async (dispatch, getState) => {
    dispatch(getAllFilesForCoursesAction.request());

    try {
      const results = await dataSource.getAllContents(
        courseIds,
        ContentType.FILE,
      );
      const courseNames = getState().courses.names;
      const files = Object.keys(results)
        .map((courseId) => {
          const filesForCourse = results[courseId] as IFile[];
          const courseName = courseNames[courseId];
          return filesForCourse.map<File>((file) => ({
            ...file,
            courseId,
            courseName: courseName.name,
            courseTeacherName: courseName.teacherName,
          }));
        })
        .reduce((a, b) => a.concat(b))
        .sort(
          (a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix(),
        );
      dispatch(getAllFilesForCoursesAction.success(files));
    } catch (err) {
      dispatch(getAllFilesForCoursesAction.failure(err));
    }
  };
}

export const setPinFile = createAction(
  SET_PIN_FILE,
  (fileId: string, flag: boolean) => ({
    fileId,
    flag,
  }),
)();

export const setFavFile = createAction(
  SET_FAV_FILE,
  (fileId: string, flag: boolean) => ({
    fileId,
    flag,
  }),
)();

export const setUnreadFile = createAction(
  SET_UNREAD_FILE,
  (fileId: string, flag: boolean) => ({
    fileId,
    flag,
  }),
)();

export const setArchiveFiles = createAction(
  SET_ARCHIVE_FILES,
  (fileIds: string[], flag: boolean) => ({
    fileIds,
    flag,
  }),
)();
