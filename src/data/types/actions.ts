import { ThunkAction } from 'redux-thunk';
import { ActionType } from 'typesafe-actions';
import { loginAction, setSSOInProgress } from 'data/actions/auth';
import {
  getAllFilesForCoursesAction,
  getFilesForCourseAction,
} from 'data/actions/files';
import { clearStoreAction, setMockStoreAction } from 'data/actions/root';
import { PersistAppState } from './state';

type LoginAction = ActionType<typeof loginAction>;
type SetSsoInProgressAction = ActionType<typeof setSSOInProgress>;
export type AuthAction = LoginAction | SetSsoInProgressAction;

type GetFilesForCourseAction = ActionType<typeof getFilesForCourseAction>;
type GetAllFilesForCoursesAction = ActionType<
  typeof getAllFilesForCoursesAction
>;
export type FilesAction = GetFilesForCourseAction | GetAllFilesForCoursesAction;

export type ClearStoreAction = ActionType<typeof clearStoreAction>;
export type SetMockStoreAction = ActionType<typeof setMockStoreAction>;
export type StoreAction = ClearStoreAction | SetMockStoreAction;

export type AppActions = AuthAction | FilesAction | StoreAction;

export type ThunkResult = ThunkAction<
  void,
  PersistAppState,
  undefined,
  AppActions
>;
