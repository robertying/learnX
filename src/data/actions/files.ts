import { ContentType, CourseType, ApiError } from 'thu-learn-lib';
import { createAsyncAction } from 'typesafe-actions';
import dayjs from 'dayjs';
import { getCourseNames } from 'data/queries';
import { dataSource } from 'data/source';
import { ThunkResult } from 'data/types/actions';
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
} from 'data/types/constants';
import { File } from 'data/types/state';
import { serializeError } from 'helpers/parse';

export const getFilesForCourseAction = createAsyncAction(
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
)<undefined, { courseId: string; files: File[] }, ApiError>();

export function getFilesForCourse(courseId: string): ThunkResult {
  return async dispatch => {
    dispatch(getFilesForCourseAction.request());

    try {
      const results = await dataSource.getFileList(
        courseId,
        CourseType.STUDENT,
      );
      const files = results.map<File>(result => ({
        ...result,
        courseId,
        ...getCourseNames(courseId),
      }));
      const timestamps = new Map(
        files.map(f => [f.id, dayjs(f.uploadTime).unix()]),
      );
      files.sort(
        (a, b) =>
          timestamps.get(b.id)! - timestamps.get(a.id)! ||
          b.id.localeCompare(a.id),
      );
      dispatch(getFilesForCourseAction.success({ files, courseId }));
    } catch (err) {
      dispatch(getFilesForCourseAction.failure(serializeError(err)));
    }
  };
}

export const getAllFilesForCoursesAction = createAsyncAction(
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_ALL_FILES_FOR_COURSES_FAILURE,
)<undefined, File[], ApiError>();

export function getAllFilesForCourses(courseIds: string[]): ThunkResult {
  return async dispatch => {
    dispatch(getAllFilesForCoursesAction.request());

    try {
      const results = await dataSource.getAllContents(
        courseIds,
        ContentType.FILE,
      );
      const files = Object.keys(results).flatMap(courseId => {
        const filesForCourse = results[courseId];
        return filesForCourse.map<File>(file => ({
          ...file,
          courseId,
          ...getCourseNames(courseId),
        }));
      });
      const timestamps = new Map(
        files.map(f => [f.id, dayjs(f.uploadTime).unix()]),
      );
      files.sort(
        (a, b) =>
          timestamps.get(b.id)! - timestamps.get(a.id)! ||
          b.id.localeCompare(a.id),
      );
      dispatch(getAllFilesForCoursesAction.success(files));
    } catch (err) {
      dispatch(getAllFilesForCoursesAction.failure(serializeError(err)));
    }
  };
}
