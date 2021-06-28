import {createAction, createAsyncAction} from 'typesafe-actions';
import {ApiError} from 'thu-learn-lib-no-native/lib/types';
import {dataSource} from 'data/source';
import {ThunkResult} from 'data/types/actions';
import {
  GET_ALL_SEMESTERS_FAILURE,
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS,
  GET_CURRENT_SEMESTER_FAILURE,
  GET_CURRENT_SEMESTER_REQUEST,
  GET_CURRENT_SEMESTER_SUCCESS,
  SET_CURRENT_SEMESTER,
} from 'data/types/constants';

export const getAllSemestersAction = createAsyncAction(
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS,
  GET_ALL_SEMESTERS_FAILURE,
)<undefined, string[], ApiError>();

export function getAllSemesters(): ThunkResult {
  return async dispatch => {
    dispatch(getAllSemestersAction.request());

    try {
      const semesters = await dataSource.getSemesterIdList();
      dispatch(getAllSemestersAction.success(semesters.sort().reverse()));
    } catch (err) {
      dispatch(getAllSemestersAction.failure(err));
    }
  };
}

export const getCurrentSemesterAction = createAsyncAction(
  GET_CURRENT_SEMESTER_REQUEST,
  GET_CURRENT_SEMESTER_SUCCESS,
  GET_CURRENT_SEMESTER_FAILURE,
)<undefined, undefined, ApiError>();

export function getCurrentSemester(): ThunkResult {
  return async (dispatch, getState) => {
    dispatch(getCurrentSemesterAction.request());

    try {
      const semester = await dataSource.getCurrentSemester();
      dispatch(getCurrentSemesterAction.success());

      if (!getState().semesters.current) {
        dispatch(setCurrentSemester(semester.id));
      }
    } catch (err) {
      dispatch(getCurrentSemesterAction.failure(err));
    }
  };
}

export const setCurrentSemester = createAction(
  SET_CURRENT_SEMESTER,
  (semesterId: string) => semesterId,
)();
