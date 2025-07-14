import { NavigatorScreenParams } from '@react-navigation/native';
import { Assignment, Course, File, Notice } from 'data/types/state';

export interface ExtraParams {
  disableAnimation?: boolean;
}

export type NoticeStackParams = {
  Notices: undefined;
  NoticeDetail: Notice & ExtraParams;
  FileDetail: File & ExtraParams;
};

export type AssignmentStackParams = {
  Assignments: undefined;
  AssignmentDetail: Assignment & ExtraParams;
  FileDetail: File & ExtraParams;
};

export type FileStackParams = {
  Files: undefined;
  FileDetail: File & ExtraParams;
};

export type CourseStackParams = {
  Courses: undefined;
  CourseDetail: Course & ExtraParams;
  NoticeDetail: Notice & ExtraParams;
  AssignmentDetail: Assignment & ExtraParams;
  FileDetail: File & ExtraParams;
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
};

export type MainTabParams = {
  NoticeStack: NavigatorScreenParams<NoticeStackParams>;
  AssignmentStack: NavigatorScreenParams<AssignmentStackParams>;
  FileStack: NavigatorScreenParams<FileStackParams>;
  CourseStack: NavigatorScreenParams<CourseStackParams>;
  SettingStack: NavigatorScreenParams<SettingsStackParams>;
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
  NoticeDetail: Notice & ExtraParams;
  AssignmentDetail: Assignment & ExtraParams;
  FileDetail: File & ExtraParams;
};

export type AssignmentSubmissionStackParams = {
  AssignmentSubmission: Assignment;
  FileDetail: File & ExtraParams;
};

export type DetailStackParams = {
  EmptyDetail: undefined;
  NoticeDetail: Notice & ExtraParams;
  AssignmentDetail: Assignment & ExtraParams;
  FileDetail: File & ExtraParams;
  CourseDetail: Course & ExtraParams;
  AssignmentSubmission: Assignment;
  CourseX: { id: string } | undefined;
  CourseInformationSharing: ExtraParams;
  CalendarEvent: ExtraParams;
  SemesterSelection: ExtraParams;
  FileSettings: ExtraParams;
  Help: ExtraParams;
  About: ExtraParams;
  Changelog: ExtraParams;
};

export type RootStackParams = {
  MainTab: NavigatorScreenParams<MainTabParams>;
  CourseXStack: NavigatorScreenParams<CourseXStackParams>;
  SearchStack: NavigatorScreenParams<SearchStackParams>;
  AssignmentSubmissionStack: NavigatorScreenParams<AssignmentSubmissionStackParams>;
  Login: undefined;
};
