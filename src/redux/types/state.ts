import {PersistState} from 'redux-persist';

export interface IAuth {
  readonly username: string | null;
  readonly password: string | null;
}
export interface IAuthState extends IAuth {
  readonly loggingIn: boolean;
  readonly loggedIn: boolean;
  readonly error?: Error | null;
}

export enum Tab {
  'Notices',
  'Files',
  'Assignments',
  'Courses',
  'Settings',
}
export interface IWindow {
  readonly height: number;
  readonly width: number;
}
export enum NotificationType {
  'Notices',
  'Files',
  'Assignments',
  'Deadlines',
  'Grades',
}
export enum Language {
  'zh',
  'en',
}
export interface ISettingsState {
  readonly tabsOrder: readonly Tab[];
  readonly autoRefreshing: boolean;
  readonly calendarSync: boolean;
  readonly calendarId?: string;
  readonly syncedAssignments: {
    readonly [assignmentId: string]: string;
  };
  readonly hasUpdate: boolean;
  readonly window?: IWindow;
  readonly notifications: boolean;
  readonly notificationTypes: readonly NotificationType[];
  readonly lang?: Language | null;
}

export interface ISemestersState {
  readonly isFetching: boolean;
  readonly items: readonly string[];
  readonly error?: Error | null;
}

export interface ICourse {
  readonly id: string;
  readonly name: string;
  readonly teacherName?: string;
}
export interface ICoursesState {
  readonly isFetching: boolean;
  readonly pinned: readonly string[];
  readonly hidden: readonly string[];
  readonly items: ReadonlyArray<ICourse>;
  readonly error?: Error | null;
}
export type withCourseInfo<T> = T & {
  readonly courseName: string;
  readonly courseTeacherName: string;
};

export interface INotice {
  readonly courseId: string;
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly publishTime: string;
  readonly markedImportant: boolean;
  readonly content: string;
  readonly hasRead: boolean;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
}
export interface INoticesState {
  readonly isFetching: boolean;
  readonly pinned: readonly string[];
  readonly items: ReadonlyArray<INotice>;
  readonly error?: Error | null;
}

export interface IFile {
  readonly courseId: string;
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly size: string;
  readonly fileType: string;
  readonly markedImportant: boolean;
  readonly isNew: boolean;
  readonly uploadTime: string;
  readonly downloadUrl: string;
}
export interface IFilesState {
  readonly isFetching: boolean;
  readonly pinned: readonly string[];
  readonly items: ReadonlyArray<IFile>;
  readonly error?: Error | null;
}

export interface IAssignment {
  readonly courseId: string;
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly deadline: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
  readonly submitted: boolean;
  readonly submitTime?: string;
  readonly submittedContent?: string;
  readonly submittedAttachmentName?: string;
  readonly submittedAttachmentUrl?: string;
  readonly grade?: number;
  readonly gradeLevel?: string;
  readonly gradeTime?: string;
  readonly graderName?: string;
  readonly gradeContent?: string;
}
export interface IAssignmentsState {
  readonly isFetching: boolean;
  readonly pinned: readonly string[];
  readonly items: ReadonlyArray<IAssignment>;
  readonly error?: Error | null;
}

export interface PersistPartial {
  _persist: PersistState;
}

export interface IAppState {
  readonly auth: IAuthState & PersistPartial;
  readonly settings: ISettingsState;
  readonly semesters: ISemestersState;
  readonly currentSemester: string;
  readonly courses: ICoursesState;
  readonly notices: INoticesState;
  readonly files: IFilesState;
  readonly assignments: IAssignmentsState;
}
export type IPersistAppState = IAppState & PersistPartial;
