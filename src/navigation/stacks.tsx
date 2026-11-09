import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from 'helpers/i18n';
import Notices from 'screens/Notices';
import Today from 'screens/Today';
import Search from 'screens/Search';
import NoticeDetail from 'screens/NoticeDetail';
import {
  AssignmentStackParams,
  AssignmentSubmissionStackParams,
  CourseStackParams,
  CourseXStackParams,
  FileStackParams,
  ItemDetailParams,
  LoginStackParams,
  NoticeStackParams,
  SearchStackParams,
  SettingDetailParams,
  SettingsStackParams,
  TodayStackParams,
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
import Downloads from 'screens/Downloads';
import NotificationSettings from 'screens/NotificationSettings';
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
  mockNetworkTitle,
} from './options';
import { screenLayout } from './screenLayout';

const TodayStackNavigator = createNativeStackNavigator<TodayStackParams>();
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

// Screens shared by several stacks. A `Screen` or `Group` element is only
// configuration, the same for every navigator, so these are typed against
// their own param lists, which the stacks' param lists are built from.
const ItemDetails = createNativeStackNavigator<ItemDetailParams>();
const SettingDetails = createNativeStackNavigator<SettingDetailParams>();

/** The given item detail screens, for a stack whose params include them. */
export const renderItemDetails = (
  names: readonly (keyof ItemDetailParams)[],
) => (
  <ItemDetails.Group screenOptions={getDetailScreenOptions()}>
    {names.includes('CourseDetail') && (
      <ItemDetails.Screen name="CourseDetail" component={CourseDetail} />
    )}
    {names.includes('NoticeDetail') && (
      <ItemDetails.Screen name="NoticeDetail" component={NoticeDetail} />
    )}
    {names.includes('AssignmentDetail') && (
      <ItemDetails.Screen
        name="AssignmentDetail"
        component={AssignmentDetail}
      />
    )}
    {names.includes('FileDetail') && (
      <ItemDetails.Screen name="FileDetail" component={FileDetail} />
    )}
  </ItemDetails.Group>
);

/** The screens Settings opens; also shown in the split view's detail pane. */
export const renderSettingDetails = () => (
  <SettingDetails.Group>
    <SettingDetails.Screen
      name="CourseInformationSharing"
      component={CourseInformationSharing}
      options={getTitleOptions(t('courseInformationSharing'))}
    />
    <SettingDetails.Screen
      name="CalendarEvent"
      component={CalendarEvent}
      options={getTitleOptions(t('calendarsAndReminders'))}
    />
    <SettingDetails.Screen
      name="SemesterSelection"
      component={SemesterSelection}
      options={getTitleOptions(t('semesterSelection'))}
    />
    <SettingDetails.Screen
      name="FileSettings"
      component={FileSettings}
      options={getTitleOptions(t('fileSettings'))}
    />
    <SettingDetails.Screen
      name="Downloads"
      component={Downloads}
      options={getTitleOptions(t('downloads'))}
    />
    <SettingDetails.Screen
      name="NotificationSettings"
      component={NotificationSettings}
      options={getTitleOptions(t('notifications'))}
    />
    <SettingDetails.Screen
      name="Maintainer"
      component={Maintainer}
      options={getTitleOptions(t('becomeMaintainer'))}
    />
    <SettingDetails.Screen
      name="Help"
      component={Help}
      options={getTitleOptions(t('helpAndFeedback'))}
    />
    <SettingDetails.Screen
      name="About"
      component={About}
      options={getTitleOptions(t('about'))}
    />
    <SettingDetails.Screen
      name="Changelog"
      component={Changelog}
      options={getTitleOptions(t('changelog'))}
    />
    <SettingDetails.Screen
      name="MockNetwork"
      component={MockNetwork}
      options={getTitleOptions(mockNetworkTitle)}
    />
  </SettingDetails.Group>
);

export const NoticeStack = () => (
  <NoticeStackNavigator.Navigator screenLayout={screenLayout}>
    <NoticeStackNavigator.Screen
      name="Notices"
      component={Notices}
      options={getTitleOptions(t('notices'))}
    />
    {renderItemDetails(['NoticeDetail', 'FileDetail'])}
  </NoticeStackNavigator.Navigator>
);

export const AssignmentStack = () => (
  <AssignmentStackNavigator.Navigator screenLayout={screenLayout}>
    <AssignmentStackNavigator.Screen
      name="Assignments"
      component={Assignments}
      options={getTitleOptions(t('assignments'))}
    />
    {renderItemDetails(['AssignmentDetail', 'FileDetail'])}
  </AssignmentStackNavigator.Navigator>
);

export const FileStack = () => (
  <FileStackNavigator.Navigator screenLayout={screenLayout}>
    <FileStackNavigator.Screen
      name="Files"
      component={Files}
      options={getTitleOptions(t('files'))}
    />
    {renderItemDetails(['FileDetail'])}
  </FileStackNavigator.Navigator>
);

export const allItemDetails = [
  'CourseDetail',
  'NoticeDetail',
  'AssignmentDetail',
  'FileDetail',
] as const;

export const CourseStack = () => (
  <CourseStackNavigator.Navigator screenLayout={screenLayout}>
    <CourseStackNavigator.Screen
      name="Courses"
      component={Courses}
      options={getTitleOptions(t('courses'))}
    />
    {renderItemDetails(allItemDetails)}
  </CourseStackNavigator.Navigator>
);

export const SettingStack = () => (
  <SettingStackNavigator.Navigator screenLayout={screenLayout}>
    <SettingStackNavigator.Screen
      name="Settings"
      component={Settings}
      options={getTitleOptions(t('settings'))}
    />
    {renderSettingDetails()}
  </SettingStackNavigator.Navigator>
);

// Settings open from Today's header where there's no Settings tab.
export const TodayStack = () => (
  <TodayStackNavigator.Navigator screenLayout={screenLayout}>
    <TodayStackNavigator.Screen
      name="Today"
      component={Today}
      options={getTitleOptions(t('today'))}
    />
    {renderItemDetails(allItemDetails)}
    <TodayStackNavigator.Screen
      name="Settings"
      component={Settings}
      options={getTitleOptions(t('settings'))}
    />
    {renderSettingDetails()}
  </TodayStackNavigator.Navigator>
);

export const LoginStack = () => (
  <LoginNavigator.Navigator screenLayout={screenLayout}>
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
  <CourseXNavigator.Navigator screenLayout={screenLayout}>
    <CourseXNavigator.Screen
      name="CourseX"
      component={CourseX}
      options={getModalScreenOptions(t('courseX'))}
    />
  </CourseXNavigator.Navigator>
);

export const SearchStack = () => (
  <SearchNavigator.Navigator screenLayout={screenLayout}>
    <SearchNavigator.Screen
      name="Search"
      component={Search}
      options={getModalScreenOptions(t('search'))}
    />
    {renderItemDetails(['NoticeDetail', 'AssignmentDetail', 'FileDetail'])}
  </SearchNavigator.Navigator>
);

export const AssignmentSubmissionStack = () => (
  <AssignmentSubmissionNavigator.Navigator screenLayout={screenLayout}>
    <AssignmentSubmissionNavigator.Screen
      name="AssignmentSubmission"
      component={AssignmentSubmission}
      options={getModalScreenOptions(t('assignmentSubmission'))}
    />
    {renderItemDetails(['FileDetail'])}
  </AssignmentSubmissionNavigator.Navigator>
);
