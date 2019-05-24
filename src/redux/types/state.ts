import { PersistPartial } from "redux-persist";

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
  "Notices",
  "Files",
  "Assignments",
  "Courses",
  "Settings"
}
export interface IWindow {
  readonly height: number;
  readonly width: number;
}
export enum NotificationType {
  "Notices",
  "Files",
  "Assignments",
  "Deadlines",
  "Grades"
}
export enum Language {
  "zh",
  "en"
}
export interface ISettingsState {
  readonly tabsOrder: ReadonlyArray<Tab>;
  readonly autoRefreshing: boolean;
  readonly calendarSync: boolean;
  readonly calendarId?: string;
  readonly syncedAssignments: {
    readonly [assignmentId: string]: string;
  };
  readonly hasUpdate: boolean;
  readonly window?: IWindow;
  readonly notifications: boolean;
  readonly notificationTypes: ReadonlyArray<NotificationType>;
  readonly lang?: Language | null;
}

export type ISemester = string | null;
export interface ISemestersState {
  readonly isFetching: boolean;
  readonly items: ReadonlyArray<ISemester>;
}

export interface ICourse {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string;
}
export interface ICoursesState {
  readonly isFetching: boolean;
  readonly pinned: readonly string[];
  readonly hidden: readonly string[];
  readonly items: ReadonlyArray<ICourse>;
}

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
  readonly gradeTime?: string;
  readonly graderName?: string;
  readonly gradeContent?: string;
}
export interface IAssignmentsState {
  readonly isFetching: boolean;
  readonly pinned: readonly string[];
  readonly items: ReadonlyArray<IAssignment>;
}

export interface IToastState {
  readonly visible: boolean;
  readonly text: string;
}

export interface IAppState {
  readonly auth: IAuthState & PersistPartial;
  readonly settings: ISettingsState;
  readonly semesters: ISemestersState;
  readonly currentSemester: ISemester;
  readonly courses: ICoursesState;
  readonly notices: INoticesState;
  readonly files: IFilesState;
  readonly assignments: IAssignmentsState;
  readonly toast: IToastState;
}
export type IPersistAppState = IAppState & PersistPartial;
