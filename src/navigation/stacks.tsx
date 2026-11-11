import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from 'helpers/i18n';
import Notices from 'screens/Notices';
import Today from 'screens/Today';
import Schedule from 'screens/Schedule';
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
  TodayDetailParams,
  SettingsStackParams,
  TodayStackParams,
  WhatsNewStackParams,
} from 'screens/types';
import Assignments from 'screens/Assignments';
import AssignmentDetail from 'screens/AssignmentDetail';
import Files from 'screens/Files';
import FileDetail from 'screens/FileDetail';
import Courses from 'screens/Courses';
import CourseDetail from 'screens/CourseDetail';
import Settings from 'screens/Settings';
import Login from 'screens/Login';
import Welcome from 'screens/Welcome';
import WhatsNew from 'screens/WhatsNew';
import SemesterSelection from 'screens/SemesterSelection';
import CalendarEvent from 'screens/CalendarEvent';
import { calendarSettingsTitle } from 'helpers/eventDetails';
import Downloads from 'screens/Downloads';
import NotificationSettings from 'screens/NotificationSettings';
import MockNetwork from 'screens/MockNetwork';
import Debug from 'screens/Debug';
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
import { useAppState } from 'data/appState';
import { useCredentialsStore } from 'data/credentials';
import {
  getItemDetailOptions,
  getModalScreenOptions,
  hasGlassHeader,
  debugTitle,
  mockNetworkTitle,
  stackScreenOptions,
  tabRootOptions,
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
const WhatsNewNavigator = createNativeStackNavigator<WhatsNewStackParams>();
const SearchNavigator = createNativeStackNavigator<SearchStackParams>();
const AssignmentSubmissionNavigator =
  createNativeStackNavigator<AssignmentSubmissionStackParams>();

// Screens shared by several stacks. A `Screen` or `Group` element is only
// configuration, the same for every navigator, so these are typed against
// their own param lists, which the stacks' param lists are built from.
const ItemDetails = createNativeStackNavigator<ItemDetailParams>();
const SettingDetails = createNativeStackNavigator<SettingDetailParams>();
const TodayDetails = createNativeStackNavigator<TodayDetailParams>();

/** The given item detail screens, for a stack whose params include them. */
export const renderItemDetails = (
  names: readonly (keyof ItemDetailParams)[],
) => (
  <ItemDetails.Group screenOptions={getItemDetailOptions}>
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

/** The screens Today opens; also shown in the split view's detail pane. */
export const renderTodayDetails = () => (
  <TodayDetails.Group>
    <TodayDetails.Screen
      name="Schedule"
      component={Schedule}
      options={getTitleOptions(t('schedule'))}
    />
  </TodayDetails.Group>
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
      options={getTitleOptions(calendarSettingsTitle())}
    />
    <SettingDetails.Screen
      name="SemesterSelection"
      component={SemesterSelection}
      options={getTitleOptions(t('semesterSelection'))}
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
    <SettingDetails.Screen
      name="Debug"
      component={Debug}
      options={getTitleOptions(debugTitle)}
    />
  </SettingDetails.Group>
);

export const NoticeStack = () => (
  <NoticeStackNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <NoticeStackNavigator.Screen
      name="Notices"
      component={Notices}
      options={{ ...getTitleOptions(t('notices')), ...tabRootOptions }}
    />
    {renderItemDetails(['NoticeDetail', 'FileDetail'])}
  </NoticeStackNavigator.Navigator>
);

export const AssignmentStack = () => (
  <AssignmentStackNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <AssignmentStackNavigator.Screen
      name="Assignments"
      component={Assignments}
      options={{ ...getTitleOptions(t('assignments')), ...tabRootOptions }}
    />
    {renderItemDetails(['AssignmentDetail', 'FileDetail'])}
  </AssignmentStackNavigator.Navigator>
);

export const FileStack = () => (
  <FileStackNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <FileStackNavigator.Screen
      name="Files"
      component={Files}
      options={{ ...getTitleOptions(t('files')), ...tabRootOptions }}
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
  <CourseStackNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <CourseStackNavigator.Screen
      name="Courses"
      component={Courses}
      options={{ ...getTitleOptions(t('courses')), ...tabRootOptions }}
    />
    {renderItemDetails(allItemDetails)}
  </CourseStackNavigator.Navigator>
);

export const SettingStack = () => (
  <SettingStackNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
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
  <TodayStackNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <TodayStackNavigator.Screen
      name="Today"
      component={Today}
      options={{ ...getTitleOptions(t('today')), ...tabRootOptions }}
    />
    {renderTodayDetails()}
    {renderItemDetails(allItemDetails)}
    <TodayStackNavigator.Screen
      name="Settings"
      component={Settings}
      options={getTitleOptions(t('settings'))}
    />
    {renderSettingDetails()}
  </TodayStackNavigator.Navigator>
);

export const LoginStack = () => {
  const welcomeSeen = useAppState(state => state.welcomeSeen);
  // Someone logged out or asked to log in again has seen the app already.
  const hasCredentials = useCredentialsStore(state => !!state.credentials);

  return (
    <LoginNavigator.Navigator
      screenLayout={screenLayout}
      screenOptions={stackScreenOptions}
      initialRouteName={welcomeSeen || hasCredentials ? 'Login' : 'Welcome'}
    >
      <LoginNavigator.Screen
        name="Welcome"
        component={Welcome}
        options={{ headerShown: false }}
      />
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
};

/** What's New in a sheet, with the full changelog a push away. */
export const WhatsNewStack = () => (
  <WhatsNewNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <WhatsNewNavigator.Screen
      name="WhatsNew"
      component={WhatsNew}
      // The title is Changelog's back button. With the glass header the bar
      // stays, empty and clear: a bar that only appears for Changelog is laid
      // out too high in the sheet while it slides in, then drops into place.
      options={{
        headerShown: hasGlassHeader,
        headerTitle: '',
        title: t('whatsNew'),
      }}
    />
    <WhatsNewNavigator.Screen
      name="Changelog"
      component={Changelog}
      options={getTitleOptions(t('changelog'))}
    />
  </WhatsNewNavigator.Navigator>
);

export const CourseXStack = () => (
  <CourseXNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <CourseXNavigator.Screen
      name="CourseX"
      component={CourseX}
      options={getModalScreenOptions(t('courseX'))}
    />
  </CourseXNavigator.Navigator>
);

export const SearchStack = () => (
  <SearchNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <SearchNavigator.Screen
      name="Search"
      component={Search}
      options={getModalScreenOptions(t('search'))}
    />
    {renderItemDetails(['NoticeDetail', 'AssignmentDetail', 'FileDetail'])}
  </SearchNavigator.Navigator>
);

export const AssignmentSubmissionStack = () => (
  <AssignmentSubmissionNavigator.Navigator
    screenLayout={screenLayout}
    screenOptions={stackScreenOptions}
  >
    <AssignmentSubmissionNavigator.Screen
      name="AssignmentSubmission"
      component={AssignmentSubmission}
      options={getModalScreenOptions(t('assignmentSubmission'))}
    />
    {renderItemDetails(['FileDetail'])}
  </AssignmentSubmissionNavigator.Navigator>
);
