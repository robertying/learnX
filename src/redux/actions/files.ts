import { ContentType } from "thu-learn-lib-no-native/lib/types";
import { createAsyncAction } from "typesafe-actions";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS
} from "../types/constants";
import { IFile } from "../types/state";
import { login } from "./auth";
import { showToast } from "./toast";

export const getFilesForCourseAction = createAsyncAction(
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE
)<undefined, ReadonlyArray<IFile>, Error>();

export function getFilesForCourse(courseId: string): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getFilesForCourseAction.request());

    const results = await dataSource.getFileList(courseId).catch(err => {
      dispatch(showToast("刷新失败，您可能未登录", 1500));
      const auth = getState().auth;
      dispatch(login(auth.username || "", auth.password || ""));
    });

    if (results) {
      const files = results.map(result => ({ ...result, courseId }));
      dispatch(getFilesForCourseAction.success(files));
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
  return async dispatch => {
    dispatch(getAllFilesForCoursesAction.request());
    const results = await dataSource.getAllContents(
      courseIds,
      ContentType.FILE
    );
    const files = Object.keys(results)
      .map(courseId => {
        const filesForCourse = results[courseId] as any;
        return filesForCourse.map((file: IFile) => ({ ...file, courseId }));
      })
      .reduce((a, b) => a.concat(b));
    if (files) {
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
