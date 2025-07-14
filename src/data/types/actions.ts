import { ThunkAction } from 'redux-thunk';
import { ActionType } from 'typesafe-actions';
import { loginAction } from 'data/actions/auth';
import {
  getCoursesForSemesterAction,
  setHideCourse,
  setCourseOrder,
} from 'data/actions/courses';
import {
  getAllNoticesForCoursesAction,
  getNoticesForCourseAction,
  setFavNotice,
  setArchiveNotices,
} from 'data/actions/notices';
import {
  getAllAssignmentsForCoursesAction,
  getAssignmentsForCourseAction,
  setFavAssignment,
  setArchiveAssignments,
  setPendingAssignmentData,
} from 'data/actions/assignments';
import {
  getAllFilesForCoursesAction,
  getFilesForCourseAction,
  setFavFile,
  setArchiveFiles,
} from 'data/actions/files';
import {
  clearStoreAction,
  setMockStore,
  resetLoading,
} from 'data/actions/root';
import {
  getAllSemestersAction,
  getCurrentSemesterAction,
  setCurrentSemester,
} from 'data/actions/semesters';
import {
  clearEventIds,
  setEventIdForAssignment,
  setSetting,
  removeEventIdForAssignment,
} from 'data/actions/settings';
import { getUserInfoAction } from 'data/actions/user';
import { PersistAppState } from './state';

type LoginAction = ActionType<typeof loginAction>;
export type AuthAction = LoginAction;

type GetUserInfoAction = ActionType<typeof getUserInfoAction>;
export type UserAction = GetUserInfoAction;

type GetAllSemestersAction = ActionType<typeof getAllSemestersAction>;
type GetCurrentSemesterAction = ActionType<typeof getCurrentSemesterAction>;
type SetCurrentSemesterAction = ActionType<typeof setCurrentSemester>;
export type SemestersAction =
  | GetAllSemestersAction
  | GetCurrentSemesterAction
  | SetCurrentSemesterAction;

type GetCoursesForSemesterAction = ActionType<
  typeof getCoursesForSemesterAction
>;
type SetHideCourseAction = ActionType<typeof setHideCourse>;
type SetCourseOrderAction = ActionType<typeof setCourseOrder>;
export type CoursesAction =
  | GetCoursesForSemesterAction
  | SetHideCourseAction
  | SetCourseOrderAction;

type GetNoticesForCourseAction = ActionType<typeof getNoticesForCourseAction>;
type GetAllNoticesForCoursesAction = ActionType<
  typeof getAllNoticesForCoursesAction
>;
type SetFavNoticeAction = ActionType<typeof setFavNotice>;
type SetArchiveNoticesAction = ActionType<typeof setArchiveNotices>;
export type NoticesAction =
  | GetNoticesForCourseAction
  | GetAllNoticesForCoursesAction
  | SetFavNoticeAction
  | SetArchiveNoticesAction;

type GetAssignmentsForCourseAction = ActionType<
  typeof getAssignmentsForCourseAction
>;
type GetAllAssignmentsForCoursesAction = ActionType<
  typeof getAllAssignmentsForCoursesAction
>;
type SetFavAssignmentAction = ActionType<typeof setFavAssignment>;
type SetArchiveAssignmentsAction = ActionType<typeof setArchiveAssignments>;
type SetPendingAssignmentDataAction = ActionType<
  typeof setPendingAssignmentData
>;
export type AssignmentsAction =
  | GetAssignmentsForCourseAction
  | GetAllAssignmentsForCoursesAction
  | SetFavAssignmentAction
  | SetArchiveAssignmentsAction
  | SetPendingAssignmentDataAction;

type GetFilesForCourseAction = ActionType<typeof getFilesForCourseAction>;
type GetAllFilesForCoursesAction = ActionType<
  typeof getAllFilesForCoursesAction
>;
type SetFavFileAction = ActionType<typeof setFavFile>;
type SetArchiveFilesAction = ActionType<typeof setArchiveFiles>;
export type FilesAction =
  | GetFilesForCourseAction
  | GetAllFilesForCoursesAction
  | SetFavFileAction
  | SetArchiveFilesAction;

type SetSettingAction = ActionType<typeof setSetting>;
type SetEventIdForAssignmentAction = ActionType<typeof setEventIdForAssignment>;
type RemoveEventIdForAssignmentAction = ActionType<
  typeof removeEventIdForAssignment
>;
type ClearEventIdsAction = ActionType<typeof clearEventIds>;
export type SettingsAction =
  | SetSettingAction
  | SetEventIdForAssignmentAction
  | RemoveEventIdForAssignmentAction
  | ClearEventIdsAction;

export type ResetLoadingAction = ActionType<typeof resetLoading>;
export type ClearStoreAction = ActionType<typeof clearStoreAction>;
export type SetMockStoreAction = ActionType<typeof setMockStore>;
export type StoreAction =
  | ClearStoreAction
  | SetMockStoreAction
  | ResetLoadingAction;

export type AppActions =
  | AuthAction
  | UserAction
  | SemestersAction
  | CoursesAction
  | NoticesAction
  | AssignmentsAction
  | FilesAction
  | SettingsAction
  | StoreAction;

export type ThunkResult = ThunkAction<
  void,
  PersistAppState,
  undefined,
  AppActions
>;
