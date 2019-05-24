import { AnyAction } from "redux";
import { ThunkAction } from "redux-thunk";
import { ActionType } from "typesafe-actions";
import {
  getAllAssignmentsForCoursesAction,
  getAssignmentsForCourseAction,
  pinAssignment,
  unpinAssignment
} from "../actions/assignments";
import { loginAction } from "../actions/auth";
import {
  getCoursesForSemesterAction,
  pinCourse,
  setCoursesFilter,
  unpinCourse
} from "../actions/courses";
import {
  getCurrentSemester,
  setCurrentSemester
} from "../actions/currentSemester";
import {
  getAllFilesForCoursesAction,
  getFilesForCourseAction,
  pinFile,
  unpinFile
} from "../actions/files";
import {
  getAllNoticesForCoursesAction,
  getNoticesForCourseAction,
  pinNotice,
  unpinNotice
} from "../actions/notices";
import { clearStoreAction, setMockStore } from "../actions/root";
import { getAllSemestersAction } from "../actions/semesters";
import {
  clearEventIds,
  setAutoRefreshing,
  setCalendarId,
  setCalendarSync,
  setEventIdForAssignment,
  setLang,
  setNotifications,
  setNotificationTypes,
  setTabsOrder,
  setUpdate,
  setWindow
} from "../actions/settings";
import { hideToast, showToastAction } from "../actions/toast";
import { IPersistAppState } from "./state";

export type IThunkResult = ThunkAction<
  void,
  IPersistAppState,
  undefined,
  AnyAction
>;

export type ILoginAction = ActionType<typeof loginAction>;
export type IAuthAction = ILoginAction;

export type IGetAllSemestersAction = ActionType<typeof getAllSemestersAction>;
export type IGetCurrentSemesterAction = ActionType<typeof getCurrentSemester>;
export type ISetCurrentSemesterAction = ActionType<typeof setCurrentSemester>;

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

export type IGetNoticesAction =
  | IGetNoticesForCourseAction
  | IGetAllNoticesForCoursesAction;
export type IGetFilesAction =
  | IGetFilesForCourseAction
  | IGetAllFilesForCoursesAction;
export type IGetAssignmentsAction =
  | IGetAssignmentsForCourseAction
  | IGetAllAssignmentsForCoursesAction;

export type IShowToastAction = ActionType<typeof showToastAction>;
export type IHideToastAction = ActionType<typeof hideToast>;
export type IToastAction = IShowToastAction | IHideToastAction;

export type IPinNoticeAction = ActionType<typeof pinNotice>;
export type IUnpinNoticeAction = ActionType<typeof unpinNotice>;
export type IPinFileAction = ActionType<typeof pinFile>;
export type IUnpinFileAction = ActionType<typeof unpinFile>;
export type IPinAssignmentAction = ActionType<typeof pinAssignment>;
export type IUnpinAssignmentAction = ActionType<typeof unpinAssignment>;
export type IPinCourseAction = ActionType<typeof pinCourse>;
export type IUnpinCourseAction = ActionType<typeof unpinCourse>;

export type ISetCoursesFilter = ActionType<typeof setCoursesFilter>;

export type ISetTabsOrderAction = ActionType<typeof setTabsOrder>;
export type ISetAutoRefreshingAction = ActionType<typeof setAutoRefreshing>;
export type ISetCalendarSyncAction = ActionType<typeof setCalendarSync>;
export type ISetCalendarIdAction = ActionType<typeof setCalendarId>;
export type ISetEventIdForAssignment = ActionType<
  typeof setEventIdForAssignment
>;
export type IClearEventIds = ActionType<typeof clearEventIds>;
export type ISetUpdateAction = ActionType<typeof setUpdate>;
export type ISetWindowAction = ActionType<typeof setWindow>;
export type ISetNotifications = ActionType<typeof setNotifications>;
export type ISetNotificationTypes = ActionType<typeof setNotificationTypes>;
export type ISetLang = ActionType<typeof setLang>;
export type ISettingsAction =
  | ISetTabsOrderAction
  | ISetAutoRefreshingAction
  | ISetCalendarSyncAction
  | ISetCalendarIdAction
  | ISetEventIdForAssignment
  | IClearEventIds
  | ISetUpdateAction
  | ISetWindowAction
  | ISetNotifications
  | ISetNotificationTypes
  | ISetLang;

export type IClearStoreAction = ActionType<typeof clearStoreAction>;
export type ISetMockStoreAction = ActionType<typeof setMockStore>;
export type IStoreAction = IClearStoreAction | ISetMockStoreAction;

export type IAppActions =
  | IThunkResult
  | IAuthAction
  | IGetAllSemestersAction
  | IGetCurrentSemesterAction
  | ISetCurrentSemesterAction
  | IGetCoursesForSemesterAction
  | IGetNoticesForCourseAction
  | IGetFilesForCourseAction
  | IGetAssignmentsForCourseAction
  | IGetAllNoticesForCoursesAction
  | IGetAllFilesForCoursesAction
  | IGetAllAssignmentsForCoursesAction
  | IPinNoticeAction
  | IUnpinNoticeAction
  | IPinFileAction
  | IUnpinFileAction
  | IPinAssignmentAction
  | IUnpinAssignmentAction
  | IPinCourseAction
  | IUnpinCourseAction
  | ISetCoursesFilter
  | IToastAction
  | ISettingsAction
  | IStoreAction;
