import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from 'helpers/i18n';
import Notices from 'screens/Notices';
import Search from 'screens/Search';
import NoticeDetail from 'screens/NoticeDetail';
import {
  AssignmentStackParams,
  AssignmentSubmissionStackParams,
  CourseStackParams,
  CourseXStackParams,
  FileStackParams,
  LoginStackParams,
  NoticeStackParams,
  SearchStackParams,
  SettingsStackParams,
} from 'screens/types';
import Assignments from 'screens/Assignments';
import AssignmentDetail from 'screens/AssignmentDetail';
import Files from 'screens/Files';
import FileDetail from 'screens/FileDetail';
import Courses from 'screens/Courses';
import CourseDetail from 'screens/CourseDetail';
import Settings from 'screens/Settings';
import Login from 'screens/Login';
import SemesterSelection from 'screens/SemesterSelection';
import CalendarEvent from 'screens/CalendarEvent';
import FileSettings from 'screens/FileSettings';
import MockNetwork from 'screens/MockNetwork';
import SSO from 'screens/SSO';
import CourseInformationSharing from 'screens/CourseInformationSharing';
import Maintainer from 'screens/Maintainer';
import Help from 'screens/Help';
import About from 'screens/About';
import Changelog from 'screens/Changelog';
import AssignmentSubmission from 'screens/AssignmentSubmission';
import CourseX from 'screens/CourseX';
import { getTitleOptions } from 'components/HeaderTitle';
import DeviceInfo from 'constants/DeviceInfo';
import {
  getDetailScreenOptions,
  getModalScreenOptions,
  getScreenOptions,
  mockNetworkTitle,
} from './options';

const NoticeStackNavigator = createNativeStackNavigator<NoticeStackParams>();
const AssignmentStackNavigator =
  createNativeStackNavigator<AssignmentStackParams>();
const FileStackNavigator = createNativeStackNavigator<FileStackParams>();
const CourseStackNavigator = createNativeStackNavigator<CourseStackParams>();
const SettingStackNavigator = createNativeStackNavigator<SettingsStackParams>();
const LoginNavigator = createNativeStackNavigator<LoginStackParams>();
const CourseXNavigator = createNativeStackNavigator<CourseXStackParams>();
const SearchNavigator = createNativeStackNavigator<SearchStackParams>();
const AssignmentSubmissionNavigator =
  createNativeStackNavigator<AssignmentSubmissionStackParams>();

export const NoticeStack = () => (
  <NoticeStackNavigator.Navigator>
    <NoticeStackNavigator.Screen
      name="Notices"
      component={Notices}
      options={getScreenOptions(t('notices'))}
    />
    <NoticeStackNavigator.Screen
      name="NoticeDetail"
      component={NoticeDetail}
      options={getDetailScreenOptions()}
    />
    <NoticeStackNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </NoticeStackNavigator.Navigator>
);

export const AssignmentStack = () => (
  <AssignmentStackNavigator.Navigator>
    <AssignmentStackNavigator.Screen
      name="Assignments"
      component={Assignments}
      options={getScreenOptions(t('assignments'))}
    />
    <AssignmentStackNavigator.Screen
      name="AssignmentDetail"
      component={AssignmentDetail}
      options={getDetailScreenOptions()}
    />
    <AssignmentStackNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </AssignmentStackNavigator.Navigator>
);

export const FileStack = () => (
  <FileStackNavigator.Navigator>
    <FileStackNavigator.Screen
      name="Files"
      component={Files}
      options={getScreenOptions(t('files'))}
    />
    <FileStackNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </FileStackNavigator.Navigator>
);

export const CourseStack = () => (
  <CourseStackNavigator.Navigator>
    <CourseStackNavigator.Screen
      name="Courses"
      component={Courses}
      options={getScreenOptions(t('courses'))}
    />
    <CourseStackNavigator.Screen
      name="CourseDetail"
      component={CourseDetail}
      options={getDetailScreenOptions()}
    />
    <CourseStackNavigator.Screen
      name="NoticeDetail"
      component={NoticeDetail}
      options={getDetailScreenOptions()}
    />
    <CourseStackNavigator.Screen
      name="AssignmentDetail"
      component={AssignmentDetail}
      options={getDetailScreenOptions()}
    />
    <CourseStackNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </CourseStackNavigator.Navigator>
);

// Also shown in the detail pane of the split view.
export const renderSettingDetails = () => (
  <>
    <SettingStackNavigator.Screen
      name="CourseInformationSharing"
      component={CourseInformationSharing}
      options={getTitleOptions(t('courseInformationSharing'))}
    />
    <SettingStackNavigator.Screen
      name="CalendarEvent"
      component={CalendarEvent}
      options={getTitleOptions(t('calendarsAndReminders'))}
    />
    <SettingStackNavigator.Screen
      name="SemesterSelection"
      component={SemesterSelection}
      options={getTitleOptions(t('semesterSelection'))}
    />
    <SettingStackNavigator.Screen
      name="FileSettings"
      component={FileSettings}
      options={getTitleOptions(t('fileSettings'))}
    />
    <SettingStackNavigator.Screen
      name="Maintainer"
      component={Maintainer}
      options={getTitleOptions(t('becomeMaintainer'))}
    />
    <SettingStackNavigator.Screen
      name="Help"
      component={Help}
      options={getTitleOptions(t('helpAndFeedback'))}
    />
    <SettingStackNavigator.Screen
      name="About"
      component={About}
      options={getTitleOptions(t('about'))}
    />
    <SettingStackNavigator.Screen
      name="Changelog"
      component={Changelog}
      options={getTitleOptions(t('changelog'))}
    />
    <SettingStackNavigator.Screen
      name="MockNetwork"
      component={MockNetwork}
      options={getTitleOptions(mockNetworkTitle)}
    />
  </>
);
export const SettingStack = () => (
  <SettingStackNavigator.Navigator>
    <SettingStackNavigator.Screen
      name="Settings"
      component={Settings}
      options={getTitleOptions(t('settings'))}
    />
    {renderSettingDetails()}
  </SettingStackNavigator.Navigator>
);

export const LoginStack = () => (
  <LoginNavigator.Navigator>
    <LoginNavigator.Screen
      name="Login"
      component={Login}
      options={{ headerShown: false }}
    />
    <LoginNavigator.Screen
      name="SSO"
      component={SSO}
      options={props => ({
        ...getModalScreenOptions(t('sso'))(props),
        presentation: DeviceInfo.isMac() ? undefined : 'fullScreenModal',
      })}
    />
    <LoginNavigator.Screen
      name="MockNetwork"
      component={MockNetwork}
      options={getTitleOptions(mockNetworkTitle)}
    />
  </LoginNavigator.Navigator>
);

export const CourseXStack = () => (
  <CourseXNavigator.Navigator>
    <CourseXNavigator.Screen
      name="CourseX"
      component={CourseX}
      options={getModalScreenOptions(t('courseX'))}
    />
  </CourseXNavigator.Navigator>
);

export const SearchStack = () => (
  <SearchNavigator.Navigator>
    <SearchNavigator.Screen
      name="Search"
      component={Search}
      options={getModalScreenOptions(t('search'))}
    />
    <SearchNavigator.Screen
      name="NoticeDetail"
      component={NoticeDetail}
      options={getDetailScreenOptions()}
    />
    <SearchNavigator.Screen
      name="AssignmentDetail"
      component={AssignmentDetail}
      options={getDetailScreenOptions()}
    />
    <SearchNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </SearchNavigator.Navigator>
);

export const AssignmentSubmissionStack = () => (
  <AssignmentSubmissionNavigator.Navigator>
    <AssignmentSubmissionNavigator.Screen
      name="AssignmentSubmission"
      component={AssignmentSubmission}
      options={getModalScreenOptions(t('assignmentSubmission'))}
    />
    <AssignmentSubmissionNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </AssignmentSubmissionNavigator.Navigator>
);
