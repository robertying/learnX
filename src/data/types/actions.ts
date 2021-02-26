import {ThunkAction} from 'redux-thunk';
import {ActionType} from 'typesafe-actions';
import {loginAction} from 'data/actions/auth';
import {getCoursesForSemesterAction, setHideCourse} from 'data/actions/courses';
import {
  getAllNoticesForCoursesAction,
  getNoticesForCourseAction,
  setPinNotice,
  setFavNotice,
  setUnreadNotice,
  setArchiveNotices,
} from 'data/actions/notices';
import {
  getAllAssignmentsForCoursesAction,
  getAssignmentsForCourseAction,
  setPinAssignment,
  setFavAssignment,
  setUnreadAssignment,
  setArchiveAssignments,
} from 'data/actions/assignments';
import {
  getAllFilesForCoursesAction,
  getFilesForCourseAction,
  setPinFile,
  setFavFile,
  setUnreadFile,
  setArchiveFiles,
} from 'data/actions/files';
import {clearStoreAction, setMockStore, resetLoading} from 'data/actions/root';
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
import {getUserInfoAction} from 'data/actions/user';
import {PersistAppState} from './state';

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
export type CoursesAction = GetCoursesForSemesterAction | SetHideCourseAction;

type GetNoticesForCourseAction = ActionType<typeof getNoticesForCourseAction>;
type GetAllNoticesForCoursesAction = ActionType<
  typeof getAllNoticesForCoursesAction
>;
type SetPinNoticeAction = ActionType<typeof setPinNotice>;
type SetFavNoticeAction = ActionType<typeof setFavNotice>;
type SetUnreadNoticeAction = ActionType<typeof setUnreadNotice>;
type SetArchiveNoticesAction = ActionType<typeof setArchiveNotices>;
export type NoticesAction =
  | GetNoticesForCourseAction
  | GetAllNoticesForCoursesAction
  | SetPinNoticeAction
  | SetFavNoticeAction
  | SetUnreadNoticeAction
  | SetArchiveNoticesAction;

type GetAssignmentsForCourseAction = ActionType<
  typeof getAssignmentsForCourseAction
>;
type GetAllAssignmentsForCoursesAction = ActionType<
  typeof getAllAssignmentsForCoursesAction
>;
type SetPinAssignmentAction = ActionType<typeof setPinAssignment>;
type SetFavAssignmentAction = ActionType<typeof setFavAssignment>;
type SetUnreadAssignmentAction = ActionType<typeof setUnreadAssignment>;
type SetArchiveAssignmentsAction = ActionType<typeof setArchiveAssignments>;
export type AssignmentsAction =
  | GetAssignmentsForCourseAction
  | GetAllAssignmentsForCoursesAction
  | SetPinAssignmentAction
  | SetFavAssignmentAction
  | SetUnreadAssignmentAction
  | SetArchiveAssignmentsAction;

type GetFilesForCourseAction = ActionType<typeof getFilesForCourseAction>;
type GetAllFilesForCoursesAction = ActionType<
  typeof getAllFilesForCoursesAction
>;
type SetPinFileAction = ActionType<typeof setPinFile>;
type SetFavFileAction = ActionType<typeof setFavFile>;
type SetUnreadFileAction = ActionType<typeof setUnreadFile>;
type SetArchiveFilesAction = ActionType<typeof setArchiveFiles>;
export type FilesAction =
  | GetFilesForCourseAction
  | GetAllFilesForCoursesAction
  | SetPinFileAction
  | SetFavFileAction
  | SetUnreadFileAction
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
