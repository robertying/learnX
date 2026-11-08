import type {
  CompositeNavigationProp,
  CompositeScreenProps,
  NavigationContainerRef,
  NavigatorScreenParams,
  ParamListBase,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
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

/**
 * Settings details are pushed without params in a stack, and replace the
 * detail pane without animation in a split.
 */
export type SettingsStackParams = {
  Settings: undefined;
  CourseInformationSharing: ExtraParams | undefined;
  CalendarEvent: ExtraParams | undefined;
  SemesterSelection: ExtraParams | undefined;
  FileSettings: ExtraParams | undefined;
  Downloads: ExtraParams | undefined;
  NotificationSettings: ExtraParams | undefined;
  Help: ExtraParams | undefined;
  About: ExtraParams | undefined;
  Changelog: ExtraParams | undefined;
  Maintainer: ExtraParams | undefined;
  MockNetwork: ExtraParams | undefined;
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
  Downloads: ExtraParams | undefined;
  NotificationSettings: ExtraParams;
  Help: ExtraParams;
  About: ExtraParams;
  Changelog: ExtraParams;
  Maintainer: ExtraParams;
  MockNetwork: ExtraParams;
};

/** The container of a split view's detail stack. */
export type DetailNavigationContainerRef =
  React.RefObject<NavigationContainerRef<DetailStackParams> | null>;

export type RootStackParams = {
  MainTab: NavigatorScreenParams<MainTabParams>;
  CourseXStack: NavigatorScreenParams<CourseXStackParams> | undefined;
  SearchStack: NavigatorScreenParams<SearchStackParams> | undefined;
  AssignmentSubmissionStack: NavigatorScreenParams<AssignmentSubmissionStackParams>;
  LoginStack: NavigatorScreenParams<LoginStackParams>;
};

export type SplitRootStackParams = {
  Main: undefined;
  LoginStack: NavigatorScreenParams<LoginStackParams>;
};

/**
 * Navigation for a screen in one of the main tabs' stacks. Besides its own
 * stack, it can open the root stacks (search, CourseX, submission), which
 * `navigate` reaches by bubbling up through the tabs.
 */
export type MainStackNavigationProp<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList & string = keyof ParamList & string,
> = CompositeNavigationProp<
  NativeStackNavigationProp<ParamList, RouteName>,
  NativeStackNavigationProp<RootStackParams>
>;

export type MainStackScreenProps<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList & string = keyof ParamList & string,
> = CompositeScreenProps<
  NativeStackScreenProps<ParamList, RouteName>,
  NativeStackScreenProps<RootStackParams>
>;

/**
 * The routes that every one of the given param lists has. A screen that is
 * mounted in several navigators can only navigate to these, and gets the
 * params that any of them may pass.
 */
export type SharedParamList<ParamList extends ParamListBase> = Pick<
  ParamList,
  keyof ParamList
>;

// Screens mounted in several navigators: the stacks of the tabs, the root
// stacks, and the detail stack of the split view.
export type NoticeDetailParamList = SharedParamList<
  NoticeStackParams | CourseStackParams | SearchStackParams | DetailStackParams
>;
export type AssignmentDetailParamList = SharedParamList<
  | AssignmentStackParams
  | CourseStackParams
  | SearchStackParams
  | DetailStackParams
>;
export type FileDetailParamList = SharedParamList<
  | NoticeStackParams
  | AssignmentStackParams
  | FileStackParams
  | CourseStackParams
  | SearchStackParams
  | AssignmentSubmissionStackParams
  | DetailStackParams
>;
export type CourseDetailParamList = SharedParamList<
  CourseStackParams | DetailStackParams
>;
export type AssignmentSubmissionParamList = SharedParamList<
  AssignmentSubmissionStackParams | DetailStackParams
>;
export type CourseXParamList = SharedParamList<
  CourseXStackParams | DetailStackParams
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParams {}
  }
}
