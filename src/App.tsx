import {useEffect, useRef, useState} from 'react';
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
  Theme as NavigationTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  NativeStackNavigationOptions,
  NativeStackScreenProps,
} from '@react-navigation/native-stack/lib/typescript/src/types';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  IconButton,
  useTheme,
  Provider as PaperProvider,
  DefaultTheme as PaperDefaultTheme,
  MD3DarkTheme as PaperDarkTheme,
} from 'react-native-paper';
import codePush from 'react-native-code-push';
import {Provider as StoreProvider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import semverGt from 'semver/functions/gt';
import {getLocale, t} from 'helpers/i18n';
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
import FileCache from 'screens/FileCache';
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
import {resetLoading} from 'data/actions/root';
import {getCoursesForSemester} from 'data/actions/courses';
import {setCredentials} from 'data/source';
import useToast from 'hooks/useToast';
import packageJson from '../package.json';

dayjs.extend(relativeTime);
dayjs.locale(getLocale().startsWith('zh') ? 'zh-cn' : 'en');

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
              icon={props => <MaterialIcons {...props} name="star" />}
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
                      ? getLocale().startsWith('zh')
                        ? (route.params as Course).name
                        : (route.params as Course).englishName
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
      name="FileCache"
      component={FileCache}
      options={{
        title: t('fileCache'),
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
  const auth = useAppSelector(state => state.auth);
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
    if (loggedIn && auth.username && auth.password) {
      setCredentials(auth.username, auth.password);
    }
  }, [auth.password, auth.username, loggedIn]);

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

const BrandPaperDefaultTheme: typeof PaperDefaultTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    primary: '#9c27b0',
    onSurface: '#000000',
    surface: '#ffffff',
  },
};
const BrandPaperDarkTheme: typeof PaperDarkTheme = {
  ...PaperDarkTheme,
  colors: {
    ...PaperDarkTheme.colors,
    primary: '#bb86fc',
  },
};

const BrandNavigationDefaultTheme: NavigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: '#9c27b0',
  },
};
const BrandNavigationDarkTheme: NavigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: '#bb86fc',
  },
};

const Container = () => {
  const colorScheme = useColorScheme();
  const toast = useToast();

  const dispatch = useAppDispatch();
  const loggingIn = useAppSelector(state => state.auth.loggingIn);
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

  useEffect(() => {
    dispatch(login());
  }, [dispatch]);

  useEffect(() => {
    if (auth.username && auth.password && loginError) {
      toast(t('loginFailed'), 'warning', 10 * 1000);
    }
  }, [auth.password, auth.username, loginError, toast]);

  const navigationContainerProps = {
    theme:
      colorScheme === 'dark'
        ? BrandNavigationDarkTheme
        : BrandNavigationDefaultTheme,
    fallback: <Splash />,
  };

  const showDetail = loggedIn && windowSize.width >= 750;

  return auth.username && auth.password && loggingIn ? (
    <Splash />
  ) : (
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
            {loggedIn ? (
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
    <StoreProvider store={store}>
      <PersistGate loading={<Splash />} persistor={persistor}>
        <PaperProvider
          theme={
            colorScheme === 'dark'
              ? BrandPaperDarkTheme
              : BrandPaperDefaultTheme
          }>
          <StatusBar
            barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={colorScheme === 'dark' ? 'black' : 'white'}
            animated
          />
          <ToastProvider>
            <Container />
          </ToastProvider>
        </PaperProvider>
      </PersistGate>
    </StoreProvider>
  );
};

const CodePushApp = codePush(App);

export default CodePushApp;
