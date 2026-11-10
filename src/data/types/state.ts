import type {
  CourseInfo,
  Homework,
  CourseNotification,
  CourseFile,
  UserInfo,
} from '@robertying/thu-learn-lib';
import type { FilterSelection } from 'helpers/filters';

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
  /** No longer used: Reminders moves the date to any earlier alarm. */
  assignmentReminderAlarmOffset?: number;
}
/** Which notifications the app posts; all off until the user turns them on. */
export interface NotificationSettings {
  notices: boolean;
  files: boolean;
  assignments: boolean;
  grades: boolean;
  deadlineChanges: boolean;
  deadlineReminders: boolean;
  /** Minutes before an assignment's deadline to remind the user. */
  deadlineReminderOffset: number;
}
export interface SettingsState {
  assignmentCalendarSync: boolean;
  calendarEventLength?: number;
  assignmentReminderSync: boolean;
  tabFilterSelections: {
    [tab in Tab]?: FilterSelection;
  };
  alarms: AlarmSettings;
  notifications: NotificationSettings;
  graduate: boolean;
  fileUseDocumentDir: boolean;
  fileOmitCourseName: boolean;
  courseInformationSharing: boolean;
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
  /**
   * In the user's favorites (我的收藏) on the website. The notice and
   * assignment lists say so; files get it from the course's favorites.
   */
  isFavorite?: boolean;
}

export type Notice = Pick<
  CourseNotification,
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
  CourseFile,
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
export type User = {
  [key in keyof UserInfo]: UserInfo[key] | null;
};
