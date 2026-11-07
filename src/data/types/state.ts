import { PersistState } from 'redux-persist';
import type {
  CourseInfo,
  FailReason,
  Homework,
  Notification,
  File as IFile,
  UserInfo,
} from 'thu-learn-lib';
import { FilterSelection } from 'components/Filter';

/** Login progress. The credentials themselves live in data/credentials. */
export interface AuthState {
  loggingIn: boolean;
  ssoInProgress: boolean;
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
  assignmentCalendarNoAlarmIfComplete: boolean;
  assignmentReminderAlarm: boolean;
  assignmentReminderAlarmOffset?: number;
}
export interface SettingsState {
  assignmentCalendarSync: boolean;
  calendarEventLength?: number;
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
  lastShowChangelogVersion: string | null;
  openFileAfterDownload: boolean;
  courseEventOmitLocation: boolean;
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
  | 'chineseName'
  | 'englishName'
> & {
  semesterId: string;
};
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
  | 'expireTime'
  | 'markedImportant'
  | 'content'
  | 'hasRead'
  | 'attachment'
  | 'url'
> &
  CourseExtraInfo;

export type Assignment = Pick<
  Homework,
  | 'id'
  | 'studentHomeworkId'
  | 'title'
  | 'description'
  | 'deadline'
  | 'lateSubmissionDeadline'
  | 'completionType'
  | 'submissionType'
  | 'attachment'
  | 'submitted'
  | 'isLateSubmission'
  | 'submitTime'
  | 'submittedContent'
  | 'submittedAttachment'
  | 'graded'
  | 'grade'
  | 'gradeLevel'
  | 'graderName'
  | 'gradeTime'
  | 'gradeContent'
  | 'gradeAttachment'
  | 'answerContent'
  | 'answerAttachment'
  | 'url'
  | 'excellentHomeworkList'
> &
  CourseExtraInfo;

export type File = Pick<
  IFile,
  | 'id'
  | 'title'
  | 'description'
  | 'category'
  | 'size'
  | 'fileType'
  | 'markedImportant'
  | 'isNew'
  | 'uploadTime'
  | 'downloadUrl'
> &
  CourseExtraInfo;
/** What it takes to download and share a file. */
export type DownloadableFile = Pick<
  File,
  'id' | 'courseName' | 'title' | 'fileType' | 'downloadUrl'
>;
export interface FilesState {
  fetching: boolean;
  items: File[];
  error?: FailReason | null;
}

export type User = {
  [key in keyof UserInfo]: UserInfo[key] | null;
};

export interface PersistPartial {
  _persist: PersistState;
}

export interface AppState {
  auth: AuthState;
  files: FilesState;
}
export type PersistAppState = AppState & PersistPartial;
