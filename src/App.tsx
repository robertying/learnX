import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ComponentProps } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  AppState,
  Platform,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import {
  NavigationContainer,
  useNavigation,
  NavigationContainerRef,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
  NavigationIndependentTree,
  ParamListBase,
  Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import type { AppleIcon } from 'react-native-bottom-tabs';
import {
  SafeAreaProvider,
  useSafeAreaFrame,
} from 'react-native-safe-area-context';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import ShareMenu from 'react-native-share-menu';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import semverGt from 'semver/functions/gt';
import { en, zh, registerTranslation } from 'react-native-paper-dates';
import { isLocaleChinese, t } from 'helpers/i18n';
import { getLatestRelease } from 'helpers/update';
import Notices from 'screens/Notices';
import Search from 'screens/Search';
import NoticeDetail from 'screens/NoticeDetail';
import {
  AssignmentStackParams,
  AssignmentSubmissionStackParams,
  CourseStackParams,
  CourseXStackParams,
  DetailStackParams,
  ExtraParams,
  FileStackParams,
  LoginStackParams,
  MainTabParams,
  NoticeStackParams,
  RootStackParams,
  SearchStackParams,
  SettingsStackParams,
  SplitRootStackParams,
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
import SSO from 'screens/SSO';
import CourseInformationSharing from 'screens/CourseInformationSharing';
import Maintainer from 'screens/Maintainer';
import Help from 'screens/Help';
import About from 'screens/About';
import Changelog from 'screens/Changelog';
import AssignmentSubmission from 'screens/AssignmentSubmission';
import CourseX from 'screens/CourseX';
import { ToastProvider } from 'components/Toast';
import Splash from 'components/Splash';
import HeaderTitle from 'components/HeaderTitle';
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import { SplitViewProvider } from 'components/SplitView';
import NativeSplitViewProvider, {
  useSplitLaidOut,
} from 'components/NativeSplitView';
import IconButton from 'components/IconButton';
import Colors from 'constants/Colors';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { setSetting } from 'data/actions/settings';
import { persistor, store, useAppDispatch, useAppSelector } from 'data/store';
import { Notice, Assignment, File, Course } from 'data/types/state';
import { login } from 'data/actions/auth';
import { getAllSemesters, getCurrentSemester } from 'data/actions/semesters';
import { setPendingAssignmentData } from 'data/actions/assignments';
import { resetLoading } from 'data/actions/root';
import { getCoursesForSemester } from 'data/actions/courses';
import useToast from 'hooks/useToast';
import { setUpBackgroundFetch } from 'helpers/background';
import { copyFileToCache } from 'helpers/fs';
import packageJson from '../package.json';

registerTranslation('en', en);
registerTranslation('zh', zh);

dayjs.extend(relativeTime);
dayjs.locale(isLocaleChinese() ? 'zh-cn' : 'en');

const BackButton = () => {
  const navigation = useNavigation();

  return (
    <IconButton
      onPress={() => navigation.goBack()}
      icon={props => <MaterialIcons {...props} name="close" size={32} />}
    />
  );
};

const getCloseHeaderItem = (
  navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'goBack'>,
): NativeStackHeaderItem => ({
  type: 'button',
  identifier: 'close',
  label: t('close'),
  icon: { type: 'sfSymbol', name: 'xmark' },
  onPress: () => navigation.goBack(),
});

const supportsNativeSubtitle = DeviceInfo.supportsNativeSubtitle();

const getTitleOptions = (title: string, subtitle?: string) => {
  return supportsNativeSubtitle
    ? { title, headerSubtitle: subtitle }
    : {
        title,
        headerTitle: () => <HeaderTitle title={title} subtitle={subtitle} />,
      };
};

const getScreenOptions = <P extends ParamListBase, N extends keyof P>(
  title: string,
) =>
  function ({}: NativeStackScreenProps<P, N>): NativeStackNavigationOptions {
    return getTitleOptions(title);
  };

const getDetailScreenOptions = <P extends ParamListBase, N extends keyof P>() =>
  function ({
    route,
    theme,
  }: NativeStackScreenProps<P, N> & {
    theme: Theme;
  }): NativeStackNavigationOptions {
    const title =
      route.name === 'CourseX'
        ? t('courseX')
        : route.params
          ? (route.params as unknown as Course).semesterId
            ? (route.params as unknown as Course).name
            : (route.params as unknown as File).downloadUrl
              ? (route.params as unknown as Notice | Assignment).title
              : (route.params as unknown as Notice | Assignment).courseName
          : '';
    const subtitle = route.params
      ? (route.params as unknown as Course).semesterId
        ? (route.params as unknown as Course).teacherName
        : (route.params as unknown as File).downloadUrl
          ? (route.params as unknown as Notice | Assignment).courseName
          : (route.params as unknown as Notice | Assignment).courseTeacherName
      : '';
    return {
      ...getTitleOptions(title, subtitle),
      headerTintColor: Platform.OS === 'ios' ? Colors.theme : undefined,
      // A native title would otherwise take the tint color.
      headerTitleStyle: supportsNativeSubtitle
        ? { color: theme.colors.text }
        : undefined,
    };
  };

const NoticeStackNavigator = createNativeStackNavigator<NoticeStackParams>();
const AssignmentStackNavigator =
  createNativeStackNavigator<AssignmentStackParams>();
const FileStackNavigator = createNativeStackNavigator<FileStackParams>();
const CourseStackNavigator = createNativeStackNavigator<CourseStackParams>();
const SettingStackNavigator = createNativeStackNavigator<SettingsStackParams>();
const MainNativeNavigator = createNativeBottomTabNavigator<MainTabParams>();
const LoginNavigator = createNativeStackNavigator<LoginStackParams>();
const CourseXNavigator = createNativeStackNavigator<CourseXStackParams>();
const SearchNavigator = createNativeStackNavigator<SearchStackParams>();
const AssignmentSubmissionNavigator =
  createNativeStackNavigator<AssignmentSubmissionStackParams>();
const RootNavigator = createNativeStackNavigator<RootStackParams>();
const DetailNavigator = createNativeStackNavigator<DetailStackParams>();
const SplitRootNavigator = createNativeStackNavigator<SplitRootStackParams>();

const NoticeStack = () => (
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

const AssignmentStack = () => (
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

const FileStack = () => (
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

const CourseStack = () => (
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

const renderSettingDetails = () => (
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
  </>
);
const SettingStack = () => (
  <SettingStackNavigator.Navigator>
    <SettingStackNavigator.Screen
      name="Settings"
      component={Settings}
      options={getTitleOptions(t('settings'))}
    />
    {renderSettingDetails()}
  </SettingStackNavigator.Navigator>
);

const getTabBarIcon = (
  sfSymbol: AppleIcon['sfSymbol'],
  materialIcon: ComponentProps<typeof MaterialIcons>['name'],
) =>
  Platform.OS === 'ios'
    ? { sfSymbol }
    : MaterialIcons.getImageSourceSync(materialIcon, 24)!;

const useNativeSplit = Platform.OS === 'ios';

// UIKit only moves the tab bar into the vertical bar when the tab bar controller
// contains the split view, so each tab gets its own split.
const withSplit = (Master: React.ComponentType) =>
  useNativeSplit
    ? () => (
        <TabSplit>
          <Master />
        </TabSplit>
      )
    : Master;
const NoticeTab = withSplit(NoticeStack);
const AssignmentTab = withSplit(AssignmentStack);
const FileTab = withSplit(FileStack);
const CourseTab = withSplit(CourseStack);
const SettingTab = withSplit(SettingStack);

const mainTabCount = 5;

// A tab that only mounts once it's selected shows up empty first. Mounting them
// all with the first one would delay it, so the rest follow once it has settled,
// one at a time while idle, in renders that give way to anything the user does.
const useMountedTabCount = () => {
  const [count, setCount] = useState(1);
  const splitLaidOut = useSplitLaidOut();

  useEffect(() => {
    if (count >= mainTabCount || (useNativeSplit && !splitLaidOut)) {
      return;
    }

    const handle = requestIdleCallback(
      () => startTransition(() => setCount(c => c + 1)),
      { timeout: 2000 },
    );
    return () => cancelIdleCallback(handle);
  }, [count, splitLaidOut]);

  return count;
};

const MainTab = () => {
  const mountedTabCount = useMountedTabCount();
  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const currentSemester = useAppSelector(state => state.semesters.current);
  const semesters = useAppSelector(state => state.semesters.items);
  const newChangelog = useAppSelector(
    state => state.settings.lastShowChangelogVersion !== packageJson.version,
  );
  const newUpdate = useAppSelector(state => state.settings.newUpdate);
  const courseInformationSharingBadgeShown = useAppSelector(
    state => state.settings.courseInformationSharingBadgeShown,
  );

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    if (semesters.length === 0) {
      dispatch(getAllSemesters());
    }
    if (!currentSemester) {
      dispatch(getCurrentSemester());
    }
  }, [dispatch, currentSemester, loggedIn, semesters.length]);

  useEffect(() => {
    if (loggedIn && currentSemester) {
      dispatch(getCoursesForSemester(currentSemester));
    }
  }, [dispatch, currentSemester, loggedIn]);

  useEffect(() => {
    if (loggedIn) {
      setUpBackgroundFetch();
    }
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn && Platform.OS === 'android') {
      (async () => {
        const { version } = await getLatestRelease();
        if (semverGt(version, packageJson.version)) {
          dispatch(setSetting('newUpdate', true));
        }
      })();
    }
  }, [dispatch, loggedIn]);

  return (
    <MainNativeNavigator.Navigator
      labeled
      sidebarAdaptable={DeviceInfo.isMac()}
    >
      <MainNativeNavigator.Screen
        name="NoticeStack"
        component={NoticeTab}
        options={{
          title: t('notices'),
          tabBarIcon: () => getTabBarIcon('bell.fill', 'notifications'),
        }}
      />
      <MainNativeNavigator.Screen
        name="AssignmentStack"
        component={AssignmentTab}
        options={{
          lazy: mountedTabCount <= 1,
          title: t('assignments'),
          tabBarIcon: () =>
            getTabBarIcon('list.bullet.clipboard.fill', 'event'),
        }}
      />
      <MainNativeNavigator.Screen
        name="FileStack"
        component={FileTab}
        options={{
          lazy: mountedTabCount <= 2,
          title: t('files'),
          tabBarIcon: () => getTabBarIcon('doc.fill', 'folder'),
        }}
      />
      <MainNativeNavigator.Screen
        name="CourseStack"
        component={CourseTab}
        options={{
          lazy: mountedTabCount <= 3,
          title: t('courses'),
          tabBarIcon: () => getTabBarIcon('square.grid.3x3.fill', 'apps'),
        }}
      />
      <MainNativeNavigator.Screen
        name="SettingStack"
        component={SettingTab}
        options={{
          lazy: mountedTabCount <= 4,
          title: t('settings'),
          tabBarIcon: () => getTabBarIcon('gearshape.fill', 'settings'),
          tabBarBadge:
            newChangelog || newUpdate || !courseInformationSharingBadgeShown
              ? ' '
              : undefined,
        }}
      />
    </MainNativeNavigator.Navigator>
  );
};

const LoginStack = () => (
  <LoginNavigator.Navigator>
    <LoginNavigator.Screen
      name="Login"
      component={Login}
      options={{ headerShown: false }}
    />
    <LoginNavigator.Screen
      name="SSO"
      component={SSO}
      options={({ navigation }) => ({
        headerLeft: () => <BackButton />,
        unstable_headerLeftItems: () => [getCloseHeaderItem(navigation)],
        ...getTitleOptions(t('sso')),
        presentation: DeviceInfo.isMac() ? undefined : 'fullScreenModal',
      })}
    />
  </LoginNavigator.Navigator>
);

const CourseXStack = () => (
  <CourseXNavigator.Navigator>
    <CourseXNavigator.Screen
      name="CourseX"
      component={CourseX}
      options={({ navigation }) => ({
        headerLeft: () => <BackButton />,
        unstable_headerLeftItems: () => [getCloseHeaderItem(navigation)],
        ...getTitleOptions(t('courseX')),
      })}
    />
  </CourseXNavigator.Navigator>
);

const SearchStack = () => (
  <SearchNavigator.Navigator>
    <SearchNavigator.Screen
      name="Search"
      component={Search}
      options={({ navigation }) => ({
        headerLeft: () => <BackButton />,
        unstable_headerLeftItems: () => [getCloseHeaderItem(navigation)],
        ...getTitleOptions(t('search')),
      })}
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

const AssignmentSubmissionStack = () => (
  <AssignmentSubmissionNavigator.Navigator>
    <AssignmentSubmissionNavigator.Screen
      name="AssignmentSubmission"
      component={AssignmentSubmission}
      options={({ navigation }) => ({
        headerLeft: () => <BackButton />,
        unstable_headerLeftItems: () => [getCloseHeaderItem(navigation)],
        ...getTitleOptions(t('assignmentSubmission')),
      })}
    />
    <AssignmentSubmissionNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </AssignmentSubmissionNavigator.Navigator>
);

// The detail column extends underneath the primary one.
const EmptyDetail = () => (
  <SafeArea>
    <Empty />
  </SafeArea>
);

const DetailStack = () => (
  <DetailNavigator.Navigator
    // Has to be in place when the screen mounts; set from the screen itself, it
    // races the native transition.
    screenOptions={({ route }) => ({
      animation: (route.params as ExtraParams | undefined)?.disableAnimation
        ? 'none'
        : undefined,
    })}
  >
    <DetailNavigator.Screen
      name="EmptyDetail"
      component={EmptyDetail}
      options={{
        ...getTitleOptions(''),
        headerShown: !useNativeSplit || DeviceInfo.isIPad(),
      }}
    />
    <DetailNavigator.Screen
      name="NoticeDetail"
      component={NoticeDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="AssignmentDetail"
      component={AssignmentDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="CourseDetail"
      component={CourseDetail}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="AssignmentSubmission"
      component={AssignmentSubmission}
      options={getDetailScreenOptions()}
    />
    <DetailNavigator.Screen
      name="CourseX"
      component={CourseX}
      options={getDetailScreenOptions()}
    />
    {renderSettingDetails()}
  </DetailNavigator.Navigator>
);

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const lightThemeColors = {
  ...LightTheme.colors,
  primary: 'rgb(154, 37, 174)',
  onPrimary: 'rgb(255, 255, 255)',
  primaryContainer: 'rgb(255, 214, 254)',
  onPrimaryContainer: 'rgb(53, 0, 63)',
  secondary: 'rgb(107, 88, 107)',
  onSecondary: 'rgb(255, 255, 255)',
  secondaryContainer: 'rgb(244, 219, 241)',
  onSecondaryContainer: 'rgb(37, 22, 38)',
  tertiary: 'rgb(130, 82, 74)',
  onTertiary: 'rgb(255, 255, 255)',
  tertiaryContainer: 'rgb(255, 218, 212)',
  onTertiaryContainer: 'rgb(51, 17, 12)',
  error: 'rgb(186, 26, 26)',
  onError: 'rgb(255, 255, 255)',
  errorContainer: 'rgb(255, 218, 214)',
  onErrorContainer: 'rgb(65, 0, 2)',
  background: 'rgb(255, 251, 255)',
  onBackground: 'rgb(30, 26, 29)',
  surface: 'rgb(255, 251, 255)',
  onSurface: 'rgb(30, 26, 29)',
  surfaceVariant: 'rgb(236, 223, 232)',
  onSurfaceVariant: 'rgb(77, 68, 76)',
  outline: 'rgb(127, 116, 125)',
  outlineVariant: 'rgb(208, 195, 204)',
  shadow: 'rgb(0, 0, 0)',
  scrim: 'rgb(0, 0, 0)',
  inverseSurface: 'rgb(51, 47, 50)',
  inverseOnSurface: 'rgb(247, 238, 243)',
  inversePrimary: 'rgb(249, 171, 255)',
  elevation: {
    level0: 'transparent',
    level1: 'rgb(250, 240, 251)',
    level2: 'rgb(247, 234, 249)',
    level3: 'rgb(244, 228, 246)',
    level4: 'rgb(243, 225, 245)',
    level5: 'rgb(241, 221, 244)',
  },
  surfaceDisabled: 'rgba(30, 26, 29, 0.12)',
  onSurfaceDisabled: 'rgba(30, 26, 29, 0.38)',
  backdrop: 'rgba(54, 46, 53, 0.4)',
};
const darkThemeColors = {
  ...DarkTheme.colors,
  primary: 'rgb(249, 171, 255)',
  onPrimary: 'rgb(87, 0, 102)',
  primaryContainer: 'rgb(123, 0, 143)',
  onPrimaryContainer: 'rgb(255, 214, 254)',
  secondary: 'rgb(215, 191, 213)',
  onSecondary: 'rgb(59, 43, 60)',
  secondaryContainer: 'rgb(83, 65, 83)',
  onSecondaryContainer: 'rgb(244, 219, 241)',
  tertiary: 'rgb(246, 184, 173)',
  onTertiary: 'rgb(76, 37, 31)',
  tertiaryContainer: 'rgb(103, 59, 52)',
  onTertiaryContainer: 'rgb(255, 218, 212)',
  error: 'rgb(255, 180, 171)',
  onError: 'rgb(105, 0, 5)',
  errorContainer: 'rgb(147, 0, 10)',
  onErrorContainer: 'rgb(255, 180, 171)',
  background: 'rgb(30, 26, 29)',
  onBackground: 'rgb(233, 224, 228)',
  surface: 'rgb(30, 26, 29)',
  onSurface: 'rgb(233, 224, 228)',
  surfaceVariant: 'rgb(77, 68, 76)',
  onSurfaceVariant: 'rgb(208, 195, 204)',
  outline: 'rgb(153, 141, 150)',
  outlineVariant: 'rgb(77, 68, 76)',
  shadow: 'rgb(0, 0, 0)',
  scrim: 'rgb(0, 0, 0)',
  inverseSurface: 'rgb(233, 224, 228)',
  inverseOnSurface: 'rgb(51, 47, 50)',
  inversePrimary: 'rgb(154, 37, 174)',
  elevation: {
    level0: 'transparent',
    level1: 'rgb(41, 33, 40)',
    level2: 'rgb(48, 38, 47)',
    level3: 'rgb(54, 42, 54)',
    level4: 'rgb(56, 43, 56)',
    level5: 'rgb(61, 46, 61)',
  },
  surfaceDisabled: 'rgba(233, 224, 228, 0.12)',
  onSurfaceDisabled: 'rgba(233, 224, 228, 0.38)',
  backdrop: 'rgba(54, 46, 53, 0.4)',
};

const BrandLightPaperTheme = {
  ...MD3LightTheme,
  dark: false,
  colors: lightThemeColors,
  fonts: MD3LightTheme.fonts,
};
const BrandLightNavigationTheme = {
  ...NavigationDefaultTheme,
  colors: lightThemeColors,
};
const BrandDarkPaperTheme = {
  ...MD3DarkTheme,
  dark: true,
  colors: darkThemeColors,
  fonts: MD3DarkTheme.fonts,
};
const BrandDarkNavigationTheme = {
  ...NavigationDarkTheme,
  colors: darkThemeColors,
};

const TabSplit: React.FC<React.PropsWithChildren> = ({ children }) => {
  const colorScheme = useColorScheme();
  const detailNavigationContainerRef = useRef<NavigationContainerRef<{}>>(null);

  return (
    <NativeSplitViewProvider
      enabled
      detailNavigationContainerRef={detailNavigationContainerRef}
    >
      {children}
      <NavigationIndependentTree>
        <NavigationContainer
          ref={detailNavigationContainerRef}
          theme={
            colorScheme === 'dark'
              ? BrandDarkNavigationTheme
              : BrandLightNavigationTheme
          }
        >
          <DetailStack />
        </NavigationContainer>
      </NavigationIndependentTree>
    </NativeSplitViewProvider>
  );
};

const renderMainScreens = () => (
  <>
    <RootNavigator.Screen name="MainTab" component={MainTab} />
    <RootNavigator.Screen
      name="CourseXStack"
      component={CourseXStack}
      options={{ gestureEnabled: false }}
    />
    <RootNavigator.Screen
      name="SearchStack"
      component={SearchStack}
      options={{ gestureEnabled: false }}
    />
    <RootNavigator.Screen
      name="AssignmentSubmissionStack"
      component={AssignmentSubmissionStack}
      options={{ gestureEnabled: false }}
    />
  </>
);

const SplitMain = () => {
  const colorScheme = useColorScheme();
  const frame = useSafeAreaFrame();
  const detailNavigationContainerRef = useRef<NavigationContainerRef<{}>>(null);

  // The master pane mounts along with the detail container, before the ref is
  // set. Hand the ref out only once it is, so that its consumers render again.
  const [detailReady, setDetailReady] = useState(false);

  const showDetail = frame.width >= 750;

  return (
    <SplitViewProvider
      splitEnabled={DeviceInfo.isMac() || DeviceInfo.isTablet()}
      detailNavigationContainerRef={
        showDetail && detailReady ? detailNavigationContainerRef : null
      }
      showDetail={showDetail}
    >
      <RootNavigator.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'transparentModal',
        }}
      >
        {renderMainScreens()}
      </RootNavigator.Navigator>
      <NavigationIndependentTree>
        <NavigationContainer
          ref={detailNavigationContainerRef}
          theme={
            colorScheme === 'dark'
              ? BrandDarkNavigationTheme
              : BrandLightNavigationTheme
          }
          fallback={<Splash />}
          onReady={() => setDetailReady(true)}
        >
          <DetailStack />
        </NavigationContainer>
      </NavigationIndependentTree>
    </SplitViewProvider>
  );
};

// Login sits beside the split rather than in its master pane, so it always
// covers the whole window and the panes never resize underneath it.
const SplitLogin = () => (
  // On Mac Catalyst, the native side keeps stacks under this identifier out of
  // the view controller hierarchy, as it did when login was in the master pane.
  <View testID="rns-split-detail" style={Styles.flex1}>
    <LoginStack />
  </View>
);

const Container = () => {
  const colorScheme = useColorScheme();
  const toast = useToast();

  const dispatch = useAppDispatch();
  const loginError = useAppSelector(state => state.auth.error);
  const auth = useAppSelector(state => state.auth);

  const mainNavigationContainerRef = useRef<NavigationContainerRef<{}>>(null);

  const appState = useRef(AppState.currentState);
  const lastActiveTime = useRef(dayjs(0));

  const handleReLogin = useCallback(() => {
    const { auth } = store.getState();
    if (
      !auth.ssoInProgress &&
      auth.username &&
      auth.password &&
      auth.fingerPrint &&
      dayjs().diff(lastActiveTime.current, 'minute') >= 10
    ) {
      dispatch(login({ reset: true }));
      toast(t('loggingIn'), 'none', 1 * 1000);
    }
  }, [dispatch, toast]);

  useEffect(() => {
    handleReLogin();
  }, [handleReLogin]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState !== 'active') {
        lastActiveTime.current = dayjs();
      }

      if (
        appState.current?.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        dispatch(resetLoading());

        handleReLogin();
      }

      appState.current = nextAppState;
    });

    return () => sub.remove();
  }, [dispatch, handleReLogin]);

  const handleShare = useCallback(
    async (item: any) => {
      if (!item) {
        return;
      }

      let data: any = null;
      if (Platform.OS === 'ios') {
        if (!Array.isArray(item.data) || item.data.length === 0) {
          return;
        }
        data = item.data[0];
      } else {
        data = item;
        try {
          data.data = await copyFileToCache(data.data);
        } catch {
          toast(t('shareError'), 'error', 3 * 1000);
          return;
        }
      }

      if (data) {
        dispatch(setPendingAssignmentData(data));
        toast(t('shareReceived'), 'success', 5 * 1000);
      }
    },
    [dispatch, toast],
  );

  useEffect(() => {
    ShareMenu.getInitialShare(handleShare);
  }, [handleShare]);

  useEffect(() => {
    const sub = ShareMenu.addNewShareListener(handleShare);
    return () => sub.remove();
  }, [handleShare]);

  useEffect(() => {
    if (auth.username && auth.password && auth.fingerPrint && loginError) {
      toast(t('loginFailed'), 'error', 8 * 1000);
    }
  }, [auth.password, auth.username, auth.fingerPrint, loginError, toast]);

  const navigationContainerProps = {
    theme:
      colorScheme === 'dark'
        ? BrandDarkNavigationTheme
        : BrandLightNavigationTheme,
    fallback: <Splash />,
  };

  const showMain =
    !loginError && !!auth.username && !!auth.password && !!auth.fingerPrint;

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={mainNavigationContainerRef}
        {...navigationContainerProps}
      >
        {useNativeSplit ? (
          <RootNavigator.Navigator
            screenOptions={{
              headerShown: false,
              presentation: 'transparentModal',
            }}
          >
            {showMain ? (
              renderMainScreens()
            ) : (
              <RootNavigator.Screen
                name="LoginStack"
                component={LoginStack}
                options={{ gestureEnabled: false }}
              />
            )}
          </RootNavigator.Navigator>
        ) : (
          <SplitRootNavigator.Navigator screenOptions={{ headerShown: false }}>
            {showMain ? (
              <SplitRootNavigator.Screen
                name="Main"
                component={SplitMain}
                // Login slides away to reveal the main UI.
                options={{ animationTypeForReplace: 'pop' }}
              />
            ) : (
              <SplitRootNavigator.Screen
                name="LoginStack"
                component={SplitLogin}
                options={{
                  animation: 'slide_from_bottom',
                  gestureEnabled: false,
                }}
              />
            )}
          </SplitRootNavigator.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App = () => {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView>
      <PaperProvider
        theme={
          colorScheme === 'dark' ? BrandDarkPaperTheme : BrandLightPaperTheme
        }
      >
        <ToastProvider>
          <StoreProvider store={store}>
            <PersistGate loading={<Splash />} persistor={persistor}>
              <Container />
            </PersistGate>
          </StoreProvider>
        </ToastProvider>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          animated
        />
      </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default App;
