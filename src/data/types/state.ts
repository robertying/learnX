import type {
  CourseInfo,
  Homework,
  CourseNotification,
  CourseFile,
  UserInfo,
} from '@robertying/thu-learn-lib';
import type { SwipeSettings } from 'helpers/cardActions';
import type { FilterSelection } from 'helpers/filters';

export type Tab = 'notice' | 'assignment' | 'file' | 'course';

/** The semester lists of notices, assignments and files (`data/content`). */
export const contentListNames = ['notices', 'assignments', 'files'] as const;
export type ContentListName = (typeof contentListNames)[number];
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
/** Which notifications the app posts; all off until the user turns them on. */
export interface NotificationSettings {
  notices: boolean;
  files: boolean;
  assignments: boolean;
  grades: boolean;
  deadlineChanges: boolean;
  /** A group assignment submitted by someone else in the group. */
  groupSubmissions: boolean;
  /** Includes the late submission window, when there is one. */
  deadlineReminders: boolean;
  /** Minutes before an assignment's deadline to remind the user. */
  deadlineReminderOffset: number;
  classReminders: boolean;
  /** Minutes before a class starts to remind the user. */
  classReminderOffset: number;
}
export interface SettingsState {
  assignmentCalendarSync: boolean;
  assignmentReminderSync: boolean;
  tabFilterSelections: {
    [tab in Tab]?: FilterSelection;
  };
  alarms: AlarmSettings;
  notifications: NotificationSettings;
  graduate: boolean;
  courseInformationSharing: boolean;
  openFileAfterDownload: boolean;
  courseEventOmitLocation: boolean;
  /** What swiping a card right and left does */
  swipeActions: SwipeSettings;
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

/** What the app keeps of each item, the rest of the server's answer dropped. */
const courseExtraFields = [
  'courseId',
  'courseName',
  'courseTeacherName',
  'isFavorite',
] as const satisfies readonly (keyof CourseExtraInfo)[];

export const noticeFields = [
  'id',
  'title',
  'publisher',
  'publishTime',
  'expireTime',
  'markedImportant',
  'content',
  'hasRead',
  'attachment',
  'url',
  ...courseExtraFields,
] as const satisfies readonly (
  | keyof CourseNotification
  | keyof CourseExtraInfo
)[];

export type Notice = Pick<
  CourseNotification,
  Exclude<(typeof noticeFields)[number], keyof CourseExtraInfo>
> &
  CourseExtraInfo;

export const assignmentFields = [
  'id',
  'title',
  'description',
  'deadline',
  'lateSubmissionDeadline',
  'completionType',
  'submissionType',
  'attachment',
  'submitted',
  'isLateSubmission',
  'submitTime',
  'submittedContent',
  'submittedAttachment',
  'graded',
  'grade',
  'gradeLevel',
  'graderName',
  'gradeTime',
  'gradeContent',
  'gradeAttachment',
  'answerContent',
  'answerAttachment',
  'url',
  'excellentHomeworkList',
  ...courseExtraFields,
] as const satisfies readonly (keyof Homework | keyof CourseExtraInfo)[];

export type Assignment = Pick<
  Homework,
  Exclude<(typeof assignmentFields)[number], keyof CourseExtraInfo>
> &
  CourseExtraInfo;

export const fileFields = [
  'id',
  'title',
  'description',
  'category',
  'size',
  'fileType',
  'markedImportant',
  'isNew',
  'uploadTime',
  'downloadUrl',
  ...courseExtraFields,
] as const satisfies readonly (keyof CourseFile | keyof CourseExtraInfo)[];

export type File = Pick<
  CourseFile,
  Exclude<(typeof fileFields)[number], keyof CourseExtraInfo>
> &
  CourseExtraInfo;

/** What it takes to download and share a file. */
export type DownloadableFile = Pick<
  File,
  'id' | 'courseId' | 'courseName' | 'title' | 'fileType' | 'downloadUrl'
>;
export type User = {
  [key in keyof UserInfo]: UserInfo[key] | null;
};
