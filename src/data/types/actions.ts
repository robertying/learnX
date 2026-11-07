import { ThunkAction } from 'redux-thunk';
import { ActionType } from 'typesafe-actions';
import { loginAction, setSSOInProgress } from 'data/actions/auth';
import { getCoursesForSemesterAction } from 'data/actions/courses';
import {
  getAllNoticesForCoursesAction,
  getNoticesForCourseAction,
} from 'data/actions/notices';
import {
  getAllAssignmentsForCoursesAction,
  getAssignmentsForCourseAction,
  setPendingAssignmentData,
} from 'data/actions/assignments';
import {
  getAllFilesForCoursesAction,
  getFilesForCourseAction,
} from 'data/actions/files';
import { clearStoreAction, setMockStoreAction } from 'data/actions/root';
import {
  getAllSemestersAction,
  getCurrentSemesterAction,
  setCurrentSemester,
} from 'data/actions/semesters';
import { getUserInfoAction } from 'data/actions/user';
import { PersistAppState } from './state';

type LoginAction = ActionType<typeof loginAction>;
type SetSsoInProgressAction = ActionType<typeof setSSOInProgress>;
export type AuthAction = LoginAction | SetSsoInProgressAction;

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
export type CoursesAction = GetCoursesForSemesterAction;

type GetNoticesForCourseAction = ActionType<typeof getNoticesForCourseAction>;
type GetAllNoticesForCoursesAction = ActionType<
  typeof getAllNoticesForCoursesAction
>;
export type NoticesAction =
  | GetNoticesForCourseAction
  | GetAllNoticesForCoursesAction;

type GetAssignmentsForCourseAction = ActionType<
  typeof getAssignmentsForCourseAction
>;
type GetAllAssignmentsForCoursesAction = ActionType<
  typeof getAllAssignmentsForCoursesAction
>;
type SetPendingAssignmentDataAction = ActionType<
  typeof setPendingAssignmentData
>;
export type AssignmentsAction =
  | GetAssignmentsForCourseAction
  | GetAllAssignmentsForCoursesAction
  | SetPendingAssignmentDataAction;

type GetFilesForCourseAction = ActionType<typeof getFilesForCourseAction>;
type GetAllFilesForCoursesAction = ActionType<
  typeof getAllFilesForCoursesAction
>;
export type FilesAction = GetFilesForCourseAction | GetAllFilesForCoursesAction;

export type ClearStoreAction = ActionType<typeof clearStoreAction>;
export type SetMockStoreAction = ActionType<typeof setMockStoreAction>;
export type StoreAction = ClearStoreAction | SetMockStoreAction;

export type AppActions =
  | AuthAction
  | UserAction
  | SemestersAction
  | CoursesAction
  | NoticesAction
  | AssignmentsAction
  | FilesAction
  | StoreAction;

export type ThunkResult = ThunkAction<
  void,
  PersistAppState,
  undefined,
  AppActions
>;
