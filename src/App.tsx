import {useEffect, useRef, useState} from 'react';
import {
  AppState,
  AppStateStatus,
  Platform,
  StatusBar,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
  useNavigation,
  Theme as NavigationTheme,
  NavigationContainerRef,
} from '@react-navigation/native';
import {createStackNavigator, StackScreenProps} from '@react-navigation/stack';
import {StackNavigationOptions} from '@react-navigation/stack/lib/typescript/src/types';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  Provider as PaperProvider,
  DefaultTheme as PaperDefaultTheme,
  DarkTheme as PaperDarkTheme,
  IconButton,
  useTheme,
} from 'react-native-paper';
import codePush from 'react-native-code-push';
import {Provider as StoreProvider, useDispatch} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import semverGt from 'semver/functions/gt';
import {getLocale, t} from 'helpers/i18n';
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
import CourseX from 'screens/CourseX';
import {ToastProvider} from 'components/Toast';
import Splash from 'components/Splash';
import HeaderTitle from 'components/HeaderTitle';
import Empty from 'components/Empty';
import {SplitViewProvider} from 'components/SplitView';
import Styles from 'constants/Styles';
import Colors from 'constants/Colors';
import {getLatestRelease} from 'helpers/update';
import {setSetting} from 'data/actions/settings';
import {persistor, store, useTypedSelector} from 'data/store';
import {Notice, Assignment, File, Course} from 'data/types/state';
import {login} from 'data/actions/auth';
import {getAllSemesters, getCurrentSemester} from 'data/actions/semesters';
import {resetLoading} from 'data/actions/root';
import {getCoursesForSemester} from 'data/actions/courses';
import {setCredentials} from 'data/source';
import DeviceInfo from 'constants/DeviceInfo';
import TextButton from 'components/TextButton';
import useToast from 'hooks/useToast';
import packageJson from '../package.json';

dayjs.extend(relativeTime);
dayjs.locale(getLocale().startsWith('zh') ? 'zh-cn' : 'en');

const BackButton = () => {
  const navigation = useNavigation();

  return (
    <IconButton
      onPress={() => navigation.goBack()}
      icon={props => <MaterialIcons {...props} name="close" />}
    />
  );
};

const getScreenOptions = (title: string) =>
  function ({
    navigation,
  }: StackScreenProps<ScreenParams>): StackNavigationOptions {
    return {
      title,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: '600',
      },
      headerLeft: () => (
        <View style={Styles.flexRow}>
          <IconButton
            icon={props => <MaterialIcons {...props} name="subject" />}
          />
          <IconButton
            style={Styles.ml0}
            icon={props => <MaterialIcons {...props} name="filter-list" />}
          />
          {title === t('courses') && (
            <IconButton
              style={Styles.ml0}
              icon={props => <MaterialIcons {...props} name="star" />}
            />
          )}
        </View>
      ),
      headerRight: () => (
        <View style={Styles.flexRow}>
          {DeviceInfo.isMac() && (
            <IconButton
              style={Styles.mr0}
              icon={props => <MaterialIcons {...props} name="refresh" />}
            />
          )}
          <IconButton
            onPress={() => navigation.navigate('Search')}
            icon={props => <MaterialIcons {...props} name="search" />}
          />
        </View>
      ),
      headerTintColor: Colors.theme,
    };
  };

const getDetailScreenOptions = () =>
  function ({
    route,
  }: StackScreenProps<
    ScreenParams,
    | 'NoticeDetail'
    | 'AssignmentDetail'
    | 'FileDetail'
    | 'CourseDetail'
    | 'AssignmentSubmission'
    | 'CourseX'
  >): StackNavigationOptions {
    return {
      title: t('back'),
      headerTitleAlign: 'center',
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: '600',
      },
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
      headerBackTitleStyle: {
        maxWidth: 60,
      },
      headerRight: (route.params as File)?.downloadUrl
        ? () => (
            <View style={Styles.flexRow}>
              <IconButton
                style={Styles.mr0}
                icon={props => <MaterialIcons {...props} name="refresh" />}
              />
              <IconButton
                style={DeviceInfo.isMac() ? Styles.mr0 : undefined}
                icon={props => <MaterialIcons {...props} name="ios-share" />}
              />
              {DeviceInfo.isMac() && (
                <IconButton
                  icon={props => (
                    <MaterialIcons {...props} name="open-in-new" />
                  )}
                />
              )}
            </View>
          )
        : undefined,
      headerTintColor: Colors.theme,
    };
  };

const NoticeStackNavigator = createStackNavigator<ScreenParams>();
const AssignmentStackNavigator = createStackNavigator<ScreenParams>();
const FileStackNavigator = createStackNavigator<ScreenParams>();
const CourseStackNavigator = createStackNavigator<ScreenParams>();
const SettingStackNavigator = createStackNavigator<ScreenParams>();
const MainNavigator = createBottomTabNavigator();
const CourseXNavigator = createStackNavigator<ScreenParams>();
const SearchNavigator = createStackNavigator<ScreenParams>();
const AssignmentSubmissionNavigator = createStackNavigator<ScreenParams>();
const RootNavigator = createStackNavigator();
const DetailNavigator = createStackNavigator<ScreenParams>();

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
  <SettingStackNavigator.Navigator
    screenOptions={{
      headerTitleAlign: 'center',
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: '600',
      },
    }}>
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

  const dispatch = useDispatch();
  const loggedIn = useTypedSelector(state => state.auth.loggedIn);
  const auth = useTypedSelector(state => state.auth);
  const currentSemester = useTypedSelector(state => state.semesters.current);
  const semesters = useTypedSelector(state => state.semesters.items);
  const newChangelog = useTypedSelector(
    state => state.settings.lastShowChangelogVersion !== packageJson.version,
  );
  const newUpdate = useTypedSelector(state => state.settings.newUpdate);
  const courseInformationSharingBadgeShown = useTypedSelector(
    state => state.settings.courseInformationSharingBadgeShown,
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
      })}
      tabBarOptions={{
        activeTintColor: theme.colors.primary,
        inactiveTintColor: 'gray',
        adaptive: windowSize.width >= 750 ? false : true,
        labelStyle: {
          marginBottom: 4,
        },
      }}>
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
            newChangelog || newUpdate || !courseInformationSharingBadgeShown
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
          <TextButton
            style={{fontSize: 17, fontWeight: 'bold'}}
            containerStyle={{marginRight: 16}}>
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

  const dispatch = useDispatch();
  const loggingIn = useTypedSelector(state => state.auth.loggingIn);
  const loggedIn = useTypedSelector(state => state.auth.loggedIn);
  const loginError = useTypedSelector(state => state.auth.error);
  const auth = useTypedSelector(state => state.auth);
  const windowSize = useWindowDimensions();

  const [appState, setAppState] = useState(AppState.currentState);

  const mainNavigationContainerRef = useRef<NavigationContainerRef>(null);
  const detailNavigationContainerRef = useRef<NavigationContainerRef>(null);

  useEffect(() => {
    const listener = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        dispatch(resetLoading());
      }
      setAppState(nextAppState);
    };
    AppState.addEventListener('change', listener);
    return () => AppState.removeEventListener('change', listener);
  });

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
          <RootNavigator.Navigator mode="modal" headerMode="none">
            {loggedIn ? (
              <>
                <RootNavigator.Screen name="Main" component={MainTab} />
                <RootNavigator.Screen
                  name="CourseX"
                  component={CourseXStack}
                  options={{gestureEnabled: false}}
                />
                <RootNavigator.Screen
                  name="Search"
                  component={SearchStack}
                  options={{gestureEnabled: false}}
                />
                <RootNavigator.Screen
                  name="AssignmentSubmission"
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
