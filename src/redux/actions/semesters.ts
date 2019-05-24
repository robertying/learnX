import { createAsyncAction } from "typesafe-actions";
import { getTranslation } from "../../helpers/i18n";
import dataSource from "../dataSource";
import { IThunkResult } from "../types/actions";
import {
  GET_ALL_SEMESTERS_FAILURE,
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS
} from "../types/constants";
import { login } from "./auth";
import { showToast } from "./toast";

export const getAllSemestersAction = createAsyncAction(
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS,
  GET_ALL_SEMESTERS_FAILURE
)<undefined, ReadonlyArray<string>, Error>();

export function getAllSemesters(): IThunkResult {
  return async (dispatch, getState) => {
    dispatch(getAllSemestersAction.request());

    const semesters = await dataSource.getSemesterIdList().catch(err => {
      dispatch(showToast(getTranslation("refreshFailure"), 1500));
      const auth = getState().auth;
      dispatch(login(auth.username || "", auth.password || ""));
    });

    if (semesters) {
      dispatch(getAllSemestersAction.success(semesters));
    } else {
      dispatch(
        getAllSemestersAction.failure(new Error("getAllSemesters failed"))
      );
    }
  };
}
