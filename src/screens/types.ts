import {Assignment, Course, File, Notice} from 'data/types/state';

export interface ExtraParams {
  disableAnimation?: boolean;
}

export type ScreenParams = {
  Notices: undefined;
  NoticeDetail: Notice & ExtraParams;
  Assignments: undefined;
  AssignmentDetail: Assignment & ExtraParams;
  AssignmentSubmission: Assignment;
  Files: undefined;
  FileDetail: File & ExtraParams;
  Courses: undefined;
  CourseDetail: Course & ExtraParams;
  Settings: undefined;
  CourseInformationSharing: ExtraParams;
  PushNotifications: ExtraParams;
  CalendarEvent: ExtraParams;
  SemesterSelection: ExtraParams;
  FileSettings: ExtraParams;
  Help: ExtraParams;
  About: ExtraParams;
  Changelog: ExtraParams;
  Search:
    | {
        query?: string;
      }
    | undefined;
  CourseX:
    | {
        id?: string;
      }
    | undefined;
  SearchStack: undefined;
  CourseXStack: undefined;
  AssignmentSubmissionStack: undefined;
  Login: undefined;
  EmptyDetail: undefined;
  MainTab: undefined;
};
