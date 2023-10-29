import {PersistState} from 'redux-persist';
import type {
  CourseInfo,
  FailReason,
  Homework,
  Notification,
  File as IFile,
  UserInfo,
} from 'thu-learn-lib';
import {FilterSelection} from 'components/Filter';

export interface Auth {
  username: string | null;
  password: string | null;
}
export interface AuthState extends Auth {
  loggingIn: boolean;
  loggedIn: boolean;
  error?: FailReason | null;
}

export type Tab = 'notice' | 'assignment' | 'file' | 'course';
export interface AlarmSettings {
  courseAlarm: boolean;
  courseAlarmOffset?: number;
  assignmentCalendarSecondAlarm: boolean;
  assignmentCalendarSecondAlarmOffset?: number;
  assignmentCalendarAlarm: boolean;
  assignmentCalendarAlarmOffset?: number;
  assignmentReminderAlarm: boolean;
  assignmentReminderAlarmOffset?: number;
}
export interface SettingsState {
  assignmentCalendarSync: boolean;
  assignmentReminderSync: boolean;
  assignmentCalendarId?: string;
  assignmentReminderId?: string;
  syncedCalendarAssignments?: {
    [assignmentId: string]: string;
  };
  syncedReminderAssignments?: {
    [assignmentId: string]: string;
  };
  courseCalendarId?: string;
  tabFilterSelections: {
    [tab in Tab]?: FilterSelection;
  };
  alarms: AlarmSettings;
  graduate: boolean;
  fileUseDocumentDir: boolean;
  fileOmitCourseName: boolean;
  newUpdate: boolean;
  courseInformationSharing: boolean;
  courseInformationSharingBadgeShown: boolean;
  pushNotificationsBadgeShown: boolean;
  lastShowChangelogVersion: string | null;
  openFileAfterDownload: boolean;
}

export interface SemestersState {
  fetching: boolean;
  items: string[];
  current: string | null;
  error?: FailReason | null;
}

export type Course = Pick<
  CourseInfo,
  | 'id'
  | 'name'
  | 'teacherNumber'
  | 'teacherName'
  | 'timeAndLocation'
  | 'courseNumber'
  | 'courseIndex'
> & {
  semesterId: string;
};
export interface CoursesState {
  fetching: boolean;
  hidden: string[];
  items: Course[];
  names: {
    [id: string]: {
      name: string;
      teacherName: string;
    };
  };
  error?: FailReason | null;
}

interface CourseExtraInfo {
  courseId: string;
  courseName: string;
  courseTeacherName: string;
}

export type Notice = Pick<
  Notification,
  | 'id'
  | 'title'
  | 'publisher'
  | 'publishTime'
  | 'markedImportant'
  | 'content'
  | 'hasRead'
  | 'attachment'
  | 'url'
> &
  CourseExtraInfo;
export interface NoticeState {
  fetching: boolean;
  unread: string[];
  favorites: string[];
  archived: string[];
  pinned: string[];
  items: Notice[];
  error?: FailReason | null;
}

export type Assignment = Pick<
  Homework,
  | 'id'
  | 'studentHomeworkId'
  | 'title'
  | 'description'
  | 'deadline'
  | 'attachment'
  | 'submitted'
  | 'submitTime'
  | 'submittedContent'
  | 'submittedAttachment'
  | 'graded'
  | 'grade'
  | 'gradeLevel'
  | 'gradeTime'
  | 'gradeContent'
  | 'gradeAttachment'
  | 'answerContent'
  | 'answerAttachment'
  | 'url'
> &
  CourseExtraInfo;
export interface AssignmentsState {
  fetching: boolean;
  unread: string[];
  favorites: string[];
  archived: string[];
  pinned: string[];
  items: Assignment[];
  error?: FailReason | null;
  pendingAssignmentData?: {
    data: string;
    mimeType: string;
  } | null;
}

export type File = Pick<
  IFile,
  | 'id'
  | 'title'
  | 'description'
  | 'size'
  | 'fileType'
  | 'markedImportant'
  | 'isNew'
  | 'uploadTime'
  | 'downloadUrl'
> &
  CourseExtraInfo;
export interface FilesState {
  fetching: boolean;
  unread: string[];
  favorites: string[];
  archived: string[];
  pinned: string[];
  items: File[];
  error?: FailReason | null;
}

export type User = {
  [key in keyof UserInfo]: UserInfo[key] | null;
};
export interface UserState extends User {}

export interface PersistPartial {
  _persist: PersistState;
}

export interface AppState {
  auth: AuthState & PersistPartial;
  settings: SettingsState & PersistPartial;
  semesters: SemestersState;
  courses: CoursesState;
  notices: NoticeState;
  assignments: AssignmentsState;
  files: FilesState;
  user: UserState;
}
export type PersistAppState = AppState & PersistPartial;
