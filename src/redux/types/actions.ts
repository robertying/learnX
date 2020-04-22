import {ThunkAction} from 'redux-thunk';
import {ActionType} from 'typesafe-actions';
import {
  getAllAssignmentsForCoursesAction,
  getAssignmentsForCourseAction,
  pinAssignment,
  unpinAssignment,
  favAssignment,
  unfavAssignment,
  readAssignment,
  unreadAssignment,
} from '../actions/assignments';
import {loginAction, setFirebaseAuth} from '../actions/auth';
import {
  getCoursesForSemesterAction,
  hideCourse,
  unhideCourse,
} from '../actions/courses';
import {setCurrentSemester} from '../actions/currentSemester';
import {
  getAllFilesForCoursesAction,
  getFilesForCourseAction,
  pinFile,
  unpinFile,
  unfavFile,
  favFile,
  readFile,
  unreadFile,
} from '../actions/files';
import {
  getAllNoticesForCoursesAction,
  getNoticesForCourseAction,
  pinNotice,
  unpinNotice,
  unfavNotice,
  favNotice,
  readNotice,
  unreadNotice,
} from '../actions/notices';
import {clearStoreAction, setMockStore, resetLoading} from '../actions/root';
import {getAllSemestersAction} from '../actions/semesters';
import {
  clearEventIds,
  setEventIdForAssignment,
  setSetting,
  removeEventIdForAssignment,
} from '../actions/settings';
import {IPersistAppState} from './state';

export type ILoginAction = ActionType<typeof loginAction>;
export type ISetFirebaseAuthAction = ActionType<typeof setFirebaseAuth>;
export type IAuthAction = ILoginAction | ISetFirebaseAuthAction;

export type IGetAllSemestersAction = ActionType<typeof getAllSemestersAction>;
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

export type IPinNoticeAction = ActionType<typeof pinNotice>;
export type IUnpinNoticeAction = ActionType<typeof unpinNotice>;
export type IPinFileAction = ActionType<typeof pinFile>;
export type IUnpinFileAction = ActionType<typeof unpinFile>;
export type IPinAssignmentAction = ActionType<typeof pinAssignment>;
export type IUnpinAssignmentAction = ActionType<typeof unpinAssignment>;

export type IFavNoticeAction = ActionType<typeof favNotice>;
export type IUnfavNoticeAction = ActionType<typeof unfavNotice>;
export type IFavFileAction = ActionType<typeof favFile>;
export type IUnfavFileAction = ActionType<typeof unfavFile>;
export type IFavAssignmentAction = ActionType<typeof favAssignment>;
export type IUnfavAssignmentAction = ActionType<typeof unfavAssignment>;

export type IReadNoticeAction = ActionType<typeof readNotice>;
export type IUnreadNoticeAction = ActionType<typeof unreadNotice>;
export type IReadFileAction = ActionType<typeof readFile>;
export type IUnreadFileAction = ActionType<typeof unreadFile>;
export type IReadAssignmentAction = ActionType<typeof readAssignment>;
export type IUnreadAssignmentAction = ActionType<typeof unreadAssignment>;

export type IHideCourseAction = ActionType<typeof hideCourse>;
export type IUnhideCourseAction = ActionType<typeof unhideCourse>;

export type ISetSettingAction = ActionType<typeof setSetting>;
export type ISetEventIdForAssignment = ActionType<
  typeof setEventIdForAssignment
>;
export type IRemoveEventIdForAssignment = ActionType<
  typeof removeEventIdForAssignment
>;
export type IClearEventIds = ActionType<typeof clearEventIds>;

export type ISettingsAction =
  | ISetSettingAction
  | ISetEventIdForAssignment
  | IRemoveEventIdForAssignment
  | IClearEventIds;

export type IResetLoadingAction = ActionType<typeof resetLoading>;
export type IClearStoreAction = ActionType<typeof clearStoreAction>;
export type ISetMockStoreAction = ActionType<typeof setMockStore>;
export type IStoreAction =
  | IClearStoreAction
  | ISetMockStoreAction
  | IResetLoadingAction;

export type IAppActions =
  | IAuthAction
  | IGetAllSemestersAction
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
  | IFavNoticeAction
  | IUnfavNoticeAction
  | IFavFileAction
  | IUnfavFileAction
  | IFavAssignmentAction
  | IUnfavAssignmentAction
  | IReadNoticeAction
  | IUnreadNoticeAction
  | IReadFileAction
  | IUnreadFileAction
  | IReadAssignmentAction
  | IUnreadAssignmentAction
  | IHideCourseAction
  | IUnhideCourseAction
  | ISettingsAction
  | IStoreAction;

export type IThunkResult = ThunkAction<
  void,
  IPersistAppState,
  undefined,
  IAppActions
>;
