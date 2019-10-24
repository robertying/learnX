import React from 'react';
import {Navigation} from 'react-native-navigation';
import {ConnectedComponent, Provider} from 'react-redux';
import EmptyScreen from '../components/EmptyScreen';
import {store} from '../redux/store';
import AboutScreen from '../screens/AboutScreen';
import AcknowledgementsScreen from '../screens/AcknowledgementsScreen';
import AssignmentDetailScreen from '../screens/AssignmentDetailScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import CoursesScreen from '../screens/CoursesScreen';
import FilesScreen from '../screens/FilesScreen';
import LoginScreen from '../screens/LoginScreen';
import NoticeDetailScreen from '../screens/NoticeDetailScreen';
import NoticesScreen from '../screens/NoticesScreen';
import SemestersSettingsScreen from '../screens/SemestersSettingsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WebViewScreen from '../screens/WebViewScreen';
import HelpScreen from '../screens/HelpScreen';

const storeWrapped = (Component: ConnectedComponent<React.FC<any>, any>) => (
  props: any,
) => (
  <Provider store={store}>
    <Component {...props} />
  </Provider>
);

const registerScreens = () => {
  Navigation.registerComponent('empty', () => EmptyScreen);

  Navigation.registerComponent(
    'auth.loading',
    () => storeWrapped(AuthLoadingScreen),
    () => AuthLoadingScreen,
  );

  Navigation.registerComponent(
    'login',
    () => storeWrapped(LoginScreen),
    () => LoginScreen,
  );

  Navigation.registerComponent(
    'notices.index',
    () => storeWrapped(NoticesScreen),
    () => NoticesScreen,
  );
  Navigation.registerComponent('notices.detail', () => NoticeDetailScreen);

  Navigation.registerComponent(
    'files.index',
    () => storeWrapped(FilesScreen),
    () => FilesScreen,
  );

  Navigation.registerComponent(
    'assignments.index',
    () => storeWrapped(AssignmentsScreen),
    () => AssignmentsScreen,
  );
  Navigation.registerComponent(
    'assignments.detail',
    () => AssignmentDetailScreen,
  );

  Navigation.registerComponent(
    'courses.index',
    () => storeWrapped(CoursesScreen),
    () => CoursesScreen,
  );
  Navigation.registerComponent(
    'courses.detail',
    () => storeWrapped(CourseDetailScreen),
    () => CourseDetailScreen,
  );

  Navigation.registerComponent(
    'settings.index',
    () => storeWrapped(SettingsScreen),
    () => SettingsScreen,
  );
  Navigation.registerComponent(
    'settings.semesters',
    () => storeWrapped(SemestersSettingsScreen),
    () => SemestersSettingsScreen,
  );
  Navigation.registerComponent(
    'settings.acknowledgements',
    () => AcknowledgementsScreen,
  );
  Navigation.registerComponent('settings.about', () => AboutScreen);
  Navigation.registerComponent('settings.help', () => HelpScreen);

  Navigation.registerComponent('webview', () => WebViewScreen);
};

export default registerScreens;
