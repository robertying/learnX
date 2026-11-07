import { NavigatorScreenParams } from '@react-navigation/native';
import { DownloadableFile, File } from 'data/types/state';

export interface ExtraParams {
  disableAnimation?: boolean;
}

/**
 * Detail screens take the item's id and read the item from the store, so
 * they show the latest data after a refresh.
 */
export type DetailParams = { id: string } & ExtraParams;

/**
 * A file in the store by id, or a notice or assignment attachment that is
 * only known to the screen that opens it.
 */
export type FileDetailParams = (
  | { id: string }
  | { attachment: DownloadableFile & Partial<File> }
) &
  ExtraParams;

export type NoticeStackParams = {
  Notices: undefined;
  NoticeDetail: DetailParams;
  FileDetail: FileDetailParams;
};

export type AssignmentStackParams = {
  Assignments: undefined;
  AssignmentDetail: DetailParams;
  FileDetail: FileDetailParams;
};

export type FileStackParams = {
  Files: undefined;
  FileDetail: FileDetailParams;
};

export type CourseStackParams = {
  Courses: undefined;
  CourseDetail: DetailParams;
  NoticeDetail: DetailParams;
  AssignmentDetail: DetailParams;
  FileDetail: FileDetailParams;
};

export type SettingsStackParams = {
  Settings: undefined;
  CourseInformationSharing: ExtraParams;
  CalendarEvent: ExtraParams;
  SemesterSelection: ExtraParams;
  FileSettings: ExtraParams;
  Help: ExtraParams;
  About: ExtraParams;
  Changelog: ExtraParams;
  Maintainer: ExtraParams;
  MockNetwork: ExtraParams;
};

export type MainTabParams = {
  NoticeStack: NavigatorScreenParams<NoticeStackParams>;
  AssignmentStack: NavigatorScreenParams<AssignmentStackParams>;
  FileStack: NavigatorScreenParams<FileStackParams>;
  CourseStack: NavigatorScreenParams<CourseStackParams>;
  SettingStack: NavigatorScreenParams<SettingsStackParams>;
};

export type LoginStackParams = {
  Login: undefined;
  SSO: {
    username: string;
    password: string;
  };
  MockNetwork: undefined;
};

export type CourseXStackParams = {
  CourseX: { id: string } | undefined;
};

export type SearchStackParams = {
  Search:
    | {
        query: string;
      }
    | undefined;
  NoticeDetail: DetailParams;
  AssignmentDetail: DetailParams;
  FileDetail: FileDetailParams;
};

export type AssignmentSubmissionStackParams = {
  AssignmentSubmission: { id: string };
  FileDetail: FileDetailParams;
};

export type DetailStackParams = {
  EmptyDetail: undefined;
  NoticeDetail: DetailParams;
  AssignmentDetail: DetailParams;
  FileDetail: FileDetailParams;
  CourseDetail: DetailParams;
  AssignmentSubmission: { id: string };
  CourseX: { id: string } | undefined;
  CourseInformationSharing: ExtraParams;
  CalendarEvent: ExtraParams;
  SemesterSelection: ExtraParams;
  FileSettings: ExtraParams;
  Help: ExtraParams;
  About: ExtraParams;
  Changelog: ExtraParams;
  MockNetwork: ExtraParams;
};

export type RootStackParams = {
  MainTab: NavigatorScreenParams<MainTabParams>;
  CourseXStack: NavigatorScreenParams<CourseXStackParams>;
  SearchStack: NavigatorScreenParams<SearchStackParams>;
  AssignmentSubmissionStack: NavigatorScreenParams<AssignmentSubmissionStackParams>;
  LoginStack: NavigatorScreenParams<LoginStackParams>;
};

export type SplitRootStackParams = {
  Main: undefined;
  LoginStack: NavigatorScreenParams<LoginStackParams>;
};
