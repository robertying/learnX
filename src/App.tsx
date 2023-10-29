import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AppState,
  AppStateStatus,
  Platform,
  StatusBar,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import {
  NavigationContainer,
  useNavigation,
  NavigationContainerRef,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {
  NativeStackNavigationOptions,
  NativeStackScreenProps,
} from '@react-navigation/native-stack/lib/typescript/src/types';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  IconButton,
  useTheme,
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import codePush from 'react-native-code-push';
import ShareMenu from 'react-native-share-menu';
import {Provider as StoreProvider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import semverGt from 'semver/functions/gt';
import {en, zh, registerTranslation} from 'react-native-paper-dates';
import {isLocaleChinese, t} from 'helpers/i18n';
import {clearPushNotificationBadge} from 'helpers/notification';
import {getLatestRelease} from 'helpers/update';
import Notices from 'screens/Notices';
import Search from 'screens/Search';
import NoticeDetail from 'screens/NoticeDetail';
import {ScreenParams} from 'screens/types';
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
import CourseInformationSharing from 'screens/CourseInformationSharing';
import Help from 'screens/Help';
import About from 'screens/About';
import Changelog from 'screens/Changelog';
import AssignmentSubmission from 'screens/AssignmentSubmission';
import PushNotifications from 'screens/PushNotifications';
import CourseX from 'screens/CourseX';
import {ToastProvider} from 'components/Toast';
import Splash from 'components/Splash';
import HeaderTitle from 'components/HeaderTitle';
import Empty from 'components/Empty';
import {SplitViewProvider} from 'components/SplitView';
import TextButton from 'components/TextButton';
import Styles from 'constants/Styles';
import Colors from 'constants/Colors';
import DeviceInfo from 'constants/DeviceInfo';
import {setSetting} from 'data/actions/settings';
import {persistor, store, useAppDispatch, useAppSelector} from 'data/store';
import {Notice, Assignment, File, Course} from 'data/types/state';
import {login} from 'data/actions/auth';
import {getAllSemesters, getCurrentSemester} from 'data/actions/semesters';
import {setPendingAssignmentData} from 'data/actions/assignments';
import {resetLoading} from 'data/actions/root';
import {getCoursesForSemester} from 'data/actions/courses';
import useToast from 'hooks/useToast';
import packageJson from '../package.json';

registerTranslation('en', en);
registerTranslation('zh', zh);

dayjs.extend(relativeTime);
dayjs.locale(isLocaleChinese() ? 'zh-cn' : 'en');

const BackButton = () => {
  const navigation = useNavigation();

  return (
    <IconButton
      style={{marginLeft: -8}}
      onPress={() => navigation.goBack()}
      icon={props => <MaterialIcons {...props} name="close" />}
    />
  );
};

const getScreenOptions = (title: string) =>
  function ({
    navigation,
  }: NativeStackScreenProps<ScreenParams>): NativeStackNavigationOptions {
    return {
      title,
      headerLeft: () => (
        <>
          <IconButton
            style={{marginLeft: -8}}
            icon={props => <MaterialIcons {...props} name="subject" />}
          />
          <IconButton
            style={Platform.OS === 'android' ? {marginLeft: -8} : Styles.ml0}
            icon={props => <MaterialIcons {...props} name="filter-list" />}
          />
          {title === t('courses') && (
            <IconButton
              style={Platform.OS === 'android' ? {marginLeft: -8} : Styles.ml0}
              icon={props => <MaterialIcons {...props} name="info-outline" />}
            />
          )}
        </>
      ),
      headerRight: () => (
        <>
          {DeviceInfo.isMac() && (
            <IconButton
              style={Styles.mr0}
              icon={props => <MaterialIcons {...props} name="refresh" />}
            />
          )}
          <IconButton
            style={{marginRight: -8}}
            onPress={() => navigation.navigate('SearchStack')}
            icon={props => <MaterialIcons {...props} name="search" />}
          />
        </>
      ),
    };
  };

const getDetailScreenOptions = () =>
  function ({
    route,
  }: NativeStackScreenProps<
    ScreenParams,
    | 'NoticeDetail'
    | 'AssignmentDetail'
    | 'FileDetail'
    | 'CourseDetail'
    | 'AssignmentSubmission'
    | 'CourseX'
  >): NativeStackNavigationOptions {
    return {
      title: t('back'),
      headerTitle:
        route.name === 'CourseX'
          ? t('courseX')
          : props =>
              route.params ? (
                <HeaderTitle
                  {...props}
                  title={
                    (route.params as Course).semesterId
                      ? (route.params as Course).name
                      : (route.params as File).downloadUrl
                      ? (route.params as Notice | Assignment).title
                      : (route.params as Notice | Assignment).courseName
                  }
                  subtitle={
                    (route.params as Course).semesterId
                      ? (route.params as Course).teacherName
                      : (route.params as File).downloadUrl
                      ? (route.params as Notice | Assignment).courseName
                      : (route.params as Notice | Assignment).courseTeacherName
                  }
                />
              ) : undefined,
      headerRight: (route.params as File)?.downloadUrl
        ? () => (
            <>
              <IconButton
                style={{marginRight: -8}}
                icon={props => <MaterialIcons {...props} name="refresh" />}
              />
              {Platform.OS !== 'android' && (
                <IconButton
                  style={{marginRight: -8}}
                  icon={props => <MaterialIcons {...props} name="ios-share" />}
                />
              )}
              {DeviceInfo.isMac() && (
                <IconButton
                  style={{marginRight: -8}}
                  icon={props => (
                    <MaterialIcons {...props} name="open-in-new" />
                  )}
                />
              )}
            </>
          )
        : undefined,
      headerTintColor: Platform.OS === 'ios' ? Colors.theme : undefined,
    };
  };

const NoticeStackNavigator = createNativeStackNavigator<ScreenParams>();
const AssignmentStackNavigator = createNativeStackNavigator<ScreenParams>();
const FileStackNavigator = createNativeStackNavigator<ScreenParams>();
const CourseStackNavigator = createNativeStackNavigator<ScreenParams>();
const SettingStackNavigator = createNativeStackNavigator<ScreenParams>();
const MainNavigator = createBottomTabNavigator();
const CourseXNavigator = createNativeStackNavigator<ScreenParams>();
const SearchNavigator = createNativeStackNavigator<ScreenParams>();
const AssignmentSubmissionNavigator =
  createNativeStackNavigator<ScreenParams>();
const RootNavigator = createNativeStackNavigator<ScreenParams>();
const DetailNavigator = createNativeStackNavigator<ScreenParams>();

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
    <FileStackNavigator.Screen
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
    <FileStackNavigator.Screen
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

const SettingDetails = (
  <>
    <SettingStackNavigator.Screen
      name="PushNotifications"
      component={PushNotifications}
      options={{
        title: t('pushNotifications'),
      }}
    />
    <SettingStackNavigator.Screen
      name="CourseInformationSharing"
      component={CourseInformationSharing}
      options={{
        title: t('courseInformationSharing'),
      }}
    />
    <SettingStackNavigator.Screen
      name="CalendarEvent"
      component={CalendarEvent}
      options={{
        title: t('calendarsAndReminders'),
      }}
    />
    <SettingStackNavigator.Screen
      name="SemesterSelection"
      component={SemesterSelection}
      options={{
        title: t('semesterSelection'),
      }}
    />
    <SettingStackNavigator.Screen
      name="FileSettings"
      component={FileSettings}
      options={{
        title: t('fileSettings'),
      }}
    />
    <SettingStackNavigator.Screen
      name="Help"
      component={Help}
      options={{
        title: t('helpAndFeedback'),
      }}
    />
    <SettingStackNavigator.Screen
      name="About"
      component={About}
      options={{
        title: t('about'),
      }}
    />
    <SettingStackNavigator.Screen
      name="Changelog"
      component={Changelog}
      options={{
        title: t('changelog'),
      }}
    />
  </>
);
const SettingStack = () => (
  <SettingStackNavigator.Navigator>
    <SettingStackNavigator.Screen
      name="Settings"
      component={Settings}
      options={{
        title: t('settings'),
      }}
    />
    {SettingDetails}
  </SettingStackNavigator.Navigator>
);

const MainTab = () => {
  const theme = useTheme();

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
  const pushNotificationsBadgeShown = useAppSelector(
    state => state.settings.pushNotificationsBadgeShown,
  );

  const windowSize = useWindowDimensions();

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
    if (loggedIn && Platform.OS === 'android') {
      (async () => {
        const {version} = await getLatestRelease();
        if (semverGt(version, packageJson.version)) {
          dispatch(setSetting('newUpdate', true));
        }
      })();
    }
  }, [dispatch, loggedIn]);

  return (
    <MainNavigator.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'NoticeStack':
              iconName = 'notifications';
              break;
            case 'AssignmentStack':
              iconName = 'event';
              break;
            case 'FileStack':
              iconName = 'folder';
              break;
            case 'CourseStack':
              iconName = 'apps';
              break;
            case 'SettingStack':
              iconName = 'settings';
              break;
            default:
              break;
          }

          return <MaterialIcons name={iconName!} size={size} color={color} />;
        },
        activeTintColor: theme.colors.primary,
        inactiveTintColor: 'gray',
        adaptive: windowSize.width >= 750 ? false : true,
        tabBarStyle: {
          borderTopColor: theme.colors.outlineVariant,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          marginBottom: 2,
        },
        headerShown: false,
      })}>
      <MainNavigator.Screen
        name="NoticeStack"
        component={NoticeStack}
        options={{title: t('notices')}}
      />
      <MainNavigator.Screen
        name="AssignmentStack"
        component={AssignmentStack}
        options={{title: t('assignments')}}
      />
      <MainNavigator.Screen
        name="FileStack"
        component={FileStack}
        options={{title: t('files')}}
      />
      <MainNavigator.Screen
        name="CourseStack"
        component={CourseStack}
        options={{title: t('courses')}}
      />
      <MainNavigator.Screen
        name="SettingStack"
        component={SettingStack}
        options={{
          title: t('settings'),
          tabBarBadge:
            newChangelog ||
            newUpdate ||
            !courseInformationSharingBadgeShown ||
            (Platform.OS === 'ios' ? !pushNotificationsBadgeShown : false)
              ? ' '
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: 'red',
            transform: [{scale: 0.5}],
          },
        }}
      />
    </MainNavigator.Navigator>
  );
};

const CourseXStack = () => (
  <CourseXNavigator.Navigator>
    <CourseXNavigator.Screen
      name="CourseX"
      component={CourseX}
      options={{
        headerLeft: () => <BackButton />,
        title: t('courseX'),
      }}
    />
  </CourseXNavigator.Navigator>
);

const SearchStack = () => (
  <SearchNavigator.Navigator>
    <SearchNavigator.Screen
      name="Search"
      component={Search}
      options={{
        headerLeft: () => <BackButton />,
        title: t('search'),
      }}
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
      options={{
        headerLeft: () => <BackButton />,
        headerRight: () => (
          <TextButton style={{fontSize: 17, fontWeight: 'bold'}}>
            {t('submit')}
          </TextButton>
        ),
        title: t('assignmentSubmission'),
      }}
    />
    <AssignmentSubmissionNavigator.Screen
      name="FileDetail"
      component={FileDetail}
      options={getDetailScreenOptions()}
    />
  </AssignmentSubmissionNavigator.Navigator>
);

const DetailStack = () => (
  <DetailNavigator.Navigator>
    <DetailNavigator.Screen
      name="EmptyDetail"
      component={Empty}
      options={{title: ''}}
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
    {SettingDetails}
  </DetailNavigator.Navigator>
);

const {LightTheme, DarkTheme} = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});
const BrandDefaultTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
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
  },
};
const BrandDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
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
  },
};

const Container = () => {
  const colorScheme = useColorScheme();
  const toast = useToast();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const loginError = useAppSelector(state => state.auth.error);
  const auth = useAppSelector(state => state.auth);
  const windowSize = useWindowDimensions();

  const [appState, setAppState] = useState(AppState.currentState);

  const mainNavigationContainerRef = useRef<NavigationContainerRef<{}>>(null);
  const detailNavigationContainerRef = useRef<NavigationContainerRef<{}>>(null);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          dispatch(resetLoading());
          clearPushNotificationBadge();

          if (auth.username && auth.password && !loggedIn) {
            dispatch(login());
          }
        }
        setAppState(nextAppState);
      },
    );
    return () => sub.remove();
  }, [appState, auth.password, auth.username, dispatch, loggedIn]);

  const handleShare = useCallback(
    (item: any) => {
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
    let timeout: NodeJS.Timeout | null = null;
    const reLogin = () => {
      if (!auth.username || !auth.password) {
        return;
      }
      dispatch(login());
      timeout = setTimeout(reLogin, 45 * 60 * 1000 /* 45 minutes */);
    };
    reLogin();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [auth.password, auth.username, dispatch]);

  useEffect(() => {
    if (auth.username && auth.password && loginError) {
      toast(t('loginFailed'), 'warning', 5 * 1000);
    }
  }, [auth.password, auth.username, loginError, toast]);

  const navigationContainerProps = {
    theme: colorScheme === 'dark' ? BrandDarkTheme : BrandDefaultTheme,
    fallback: <Splash />,
  };

  const showMain = !loginError && !!auth.username && !!auth.password;

  const showDetail = showMain && windowSize.width >= 750;

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={mainNavigationContainerRef}
        {...navigationContainerProps}>
        <SplitViewProvider
          splitEnabled={DeviceInfo.isMac() || DeviceInfo.isTablet()}
          detailNavigationContainerRef={
            showDetail ? detailNavigationContainerRef : null
          }
          showDetail={showDetail}>
          <RootNavigator.Navigator
            screenOptions={{
              headerShown: false,
              presentation: 'fullScreenModal',
            }}>
            {showMain ? (
              <>
                <RootNavigator.Screen name="MainTab" component={MainTab} />
                <RootNavigator.Screen
                  name="CourseXStack"
                  component={CourseXStack}
                  options={{gestureEnabled: false}}
                />
                <RootNavigator.Screen
                  name="SearchStack"
                  component={SearchStack}
                  options={{gestureEnabled: false}}
                />
                <RootNavigator.Screen
                  name="AssignmentSubmissionStack"
                  component={AssignmentSubmissionStack}
                  options={{gestureEnabled: false}}
                />
              </>
            ) : (
              <RootNavigator.Screen name="Login" component={Login} />
            )}
          </RootNavigator.Navigator>
          <NavigationContainer
            independent
            ref={detailNavigationContainerRef}
            {...navigationContainerProps}>
            <DetailStack />
          </NavigationContainer>
        </SplitViewProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App = () => {
  const colorScheme = useColorScheme();

  return (
    <PaperProvider
      theme={colorScheme === 'dark' ? BrandDarkTheme : BrandDefaultTheme}>
      <ToastProvider>
        <StoreProvider store={store}>
          <PersistGate loading={<Splash />} persistor={persistor}>
            <Container />
          </PersistGate>
        </StoreProvider>
      </ToastProvider>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={
          colorScheme === 'dark'
            ? BrandDarkTheme.colors.surface
            : BrandDefaultTheme.colors.surface
        }
        animated
      />
    </PaperProvider>
  );
};

const CodePushApp = codePush(App);

export default CodePushApp;
