import { AnyAction } from "redux";
import { ThunkAction } from "redux-thunk";
import { ActionType } from "typesafe-actions";
import {
  getAllAssignmentsForCoursesAction,
  getAssignmentsForCourseAction
} from "../actions/assignments";
import { loginAction, logoutAction } from "../actions/auth";
import { getCoursesForSemesterAction } from "../actions/courses";
import { getCurrentSemester } from "../actions/currentSemester";
import {
  getAllFilesForCoursesAction,
  getFilesForCourseAction
} from "../actions/files";
import {
  getAllNoticesForCoursesAction,
  getNoticesForCourseAction
} from "../actions/notices";
import { clearStoreAction, setMockStore } from "../actions/root";
import { getAllSemestersAction } from "../actions/semesters";
import { setTabsOrder } from "../actions/settings";
import { hideToast, showToastAction } from "../actions/toast";
import { IPersistAppState } from "./state";

export type IThunkResult = ThunkAction<
  void,
  IPersistAppState,
  undefined,
  AnyAction
>;

export type ILoginAction = ActionType<typeof loginAction>;
export type ILogoutAction = ActionType<typeof logoutAction>;
export type IAuthAction = ILoginAction | ILogoutAction;

export type IGetAllSemestersAction = ActionType<typeof getAllSemestersAction>;
export type IGetCurrentSemesterAction = ActionType<typeof getCurrentSemester>;

export type IGetCoursesForSemesterAction = ActionType<
  typeof getCoursesForSemesterAction
>;
export type IGetNoticesForCourseAction = ActionType<
  typeof getNoticesForCourseAction
>;
export type IGetFilesForCourseAction = ActionType<
  typeof getFilesForCourseAction
>;
export type IGetAssignmentsForCourseAction = ActionType<
  typeof getAssignmentsForCourseAction
>;

export type IGetAllNoticesForCoursesAction = ActionType<
  typeof getAllNoticesForCoursesAction
>;
export type IGetAllFilesForCoursesAction = ActionType<
  typeof getAllFilesForCoursesAction
>;
export type IGetAllAssignmentsForCoursesAction = ActionType<
  typeof getAllAssignmentsForCoursesAction
>;

export type IShowToastAction = ActionType<typeof showToastAction>;
export type IHideToastAction = ActionType<typeof hideToast>;
export type IToastAction = IShowToastAction | IHideToastAction;

export type ISetTabsOrderAction = ActionType<typeof setTabsOrder>;
export type ISettingsAction = ISetTabsOrderAction;

export type IClearStoreAction = ActionType<typeof clearStoreAction>;
export type ISetMockStoreAction = ActionType<typeof setMockStore>;
export type IStoreAction = IClearStoreAction | ISetMockStoreAction;

export type IAppActions =
  | IThunkResult
  | IAuthAction
  | IGetAllSemestersAction
  | IGetCurrentSemesterAction
  | IGetCoursesForSemesterAction
  | IGetNoticesForCourseAction
  | IGetFilesForCourseAction
  | IGetAssignmentsForCourseAction
  | IGetAllNoticesForCoursesAction
  | IGetAllFilesForCoursesAction
  | IGetAllAssignmentsForCoursesAction
  | IToastAction
  | ISettingsAction
  | IStoreAction;
