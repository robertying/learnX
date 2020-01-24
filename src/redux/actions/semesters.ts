import {createAsyncAction} from 'typesafe-actions';
import {dataSource} from '../dataSource';
import {IThunkResult} from '../types/actions';
import {
  GET_ALL_SEMESTERS_FAILURE,
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS,
} from '../types/constants';

export const getAllSemestersAction = createAsyncAction(
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS,
  GET_ALL_SEMESTERS_FAILURE,
)<undefined, string[], Error>();

export function getAllSemesters(): IThunkResult {
  return async dispatch => {
    dispatch(getAllSemestersAction.request());

    const semesters = await dataSource.getSemesterIdList();

    if (semesters) {
      dispatch(getAllSemestersAction.success(semesters));
    } else {
      dispatch(
        getAllSemestersAction.failure(new Error('getAllSemesters failed')),
      );
    }
  };
}
