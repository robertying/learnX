import {PersistState} from 'redux-persist';
import {ApiError} from 'thu-learn-lib-no-native/lib/types';
import {FilterSelection} from 'components/Filter';

export interface Auth {
  username: string | null;
  password: string | null;
}
export interface AuthState extends Auth {
  loggingIn: boolean;
  loggedIn: boolean;
  error?: ApiError | null;
}

export type Tab = 'notice' | 'assignment' | 'file' | 'course';
export interface AlarmSettings {
  courseAlarm: boolean;
  courseAlarmOffset?: number;
  assignmentAlarm: boolean;
  assignmentAlarmOffset?: number;
}
export interface SettingsState {
  assignmentSync: boolean;
  syncAssignmentsToCalendar: boolean;
  assignmentReminderId?: string;
  assignmentCalendarId?: string;
  syncedAssignments: {
    [assignmentId: string]: string;
  };
  courseCalendarId?: string;
  tabFilterSelections: {
    [tab in Tab]?: FilterSelection;
  };
  alarms: AlarmSettings;
  graduate: boolean;
  fileUseDocumentDir: boolean;
  newUpdate: boolean;
  courseInformationSharing: boolean;
  courseInformationSharingBadgeShown: boolean;
  lastShowChangelogVersion: string | null;
}

export interface SemestersState {
  fetching: boolean;
  items: string[];
  current: string | null;
  error?: ApiError | null;
}

export interface Course {
  semesterId: string;
  id: string;
  name: string;
  englishName: string;
  teacherName: string;
  timeAndLocation: string[];
  teacherNumber: string;
  courseNumber: string;
  courseIndex: number;
}
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
  error?: ApiError | null;
}

export interface Notice {
  courseId: string;
  courseName: string;
  courseTeacherName: string;
  id: string;
  title: string;
  publisher: string;
  publishTime: string;
  markedImportant: boolean;
  content: string;
  hasRead: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
  url: string;
}
export interface NoticeState {
  fetching: boolean;
  unread: string[];
  favorites: string[];
  archived: string[];
  pinned: string[];
  items: Notice[];
  error?: ApiError | null;
}

export interface Assignment {
  courseId: string;
  courseName: string;
  courseTeacherName: string;
  id: string;
  studentHomeworkId: string;
  title: string;
  description?: string;
  deadline: string;
  url: string;
  attachmentName?: string;
  attachmentUrl?: string;
  submitted: boolean;
  submitTime?: string;
  submittedContent?: string;
  submittedAttachmentName?: string;
  submittedAttachmentUrl?: string;
  graded: boolean;
  grade?: number;
  gradeLevel?: string;
  gradeTime?: string;
  graderName?: string;
  gradeContent?: string;
  gradeAttachmentName?: string;
  gradeAttachmentUrl?: string;
  answerContent?: string;
  answerAttachmentName?: string;
  answerAttachmentUrl?: string;
}
export interface AssignmentsState {
  fetching: boolean;
  unread: string[];
  favorites: string[];
  archived: string[];
  pinned: string[];
  items: Assignment[];
  error?: ApiError | null;
}

export interface File {
  courseId: string;
  courseName: string;
  courseTeacherName: string;
  id: string;
  title: string;
  description: string;
  size: string;
  fileType?: string | null;
  markedImportant: boolean;
  isNew: boolean;
  uploadTime: string;
  downloadUrl: string;
}
export interface FilesState {
  fetching: boolean;
  unread: string[];
  favorites: string[];
  archived: string[];
  pinned: string[];
  items: File[];
  error?: ApiError | null;
}

export interface User {
  name: string | null;
  department: string | null;
  avatarUrl?: string | null;
}
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
