import { ContentType } from "thu-learn-lib-no-native/lib/types";
import { createAction, createAsyncAction } from "typesafe-actions";
import { getTranslation } from "../../helpers/i18n";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  PIN_FILE,
  UNPIN_FILE
} from "../types/constants";
import { IFile } from "../types/state";
import { login } from "./auth";
import { showToast } from "./toast";

export const getFilesForCourseAction = createAsyncAction(
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE
)<
  undefined,
  { readonly files: ReadonlyArray<IFile>; readonly courseId: string },
  Error
>();

export function getFilesForCourse(courseId: string): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getFilesForCourseAction.request());

    const results = await dataSource.getFileList(courseId).catch(err => {
      dispatch(showToast(getTranslation("refreshFailure"), 1500));
      const auth = getState().auth;
      dispatch(login(auth.username || "", auth.password || ""));
    });

    if (results) {
      const files = results.map(result => ({ ...result, courseId }));
      dispatch(getFilesForCourseAction.success({ files, courseId }));
    } else {
      dispatch(
        getFilesForCourseAction.failure(new Error("getFilesForCourse failed"))
      );
    }
  };
}

export const getAllFilesForCoursesAction = createAsyncAction(
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_ALL_FILES_FOR_COURSES_FAILURE
)<undefined, ReadonlyArray<IFile>, Error>();

export function getAllFilesForCourses(
  // tslint:disable-next-line: readonly-array
  courseIds: string[]
): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getAllFilesForCoursesAction.request());

    const results = await dataSource
      .getAllContents(courseIds, ContentType.FILE)
      .catch(err => {
        dispatch(showToast(getTranslation("refreshFailure"), 1500));
        const auth = getState().auth;
        dispatch(login(auth.username || "", auth.password || ""));
      });

    if (results) {
      const files = Object.keys(results)
        .map(courseId => {
          const filesForCourse = results[courseId] as any;
          return filesForCourse.map((file: IFile) => ({ ...file, courseId }));
        })
        .reduce((a, b) => a.concat(b));
      dispatch(getAllFilesForCoursesAction.success(files));
    } else {
      dispatch(
        getAllFilesForCoursesAction.failure(
          new Error("getAllFilesForCourses failed")
        )
      );
    }
  };
}

export const pinFile = createAction(PIN_FILE, action => {
  return (fileId: string) => action(fileId);
});

export const unpinFile = createAction(UNPIN_FILE, action => {
  return (fileId: string) => action(fileId);
});
