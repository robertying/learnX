import React from 'react';
import {Navigation} from 'react-native-navigation';
import {Provider} from 'react-redux';
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
import FilePreviewScreen from '../screens/FilePreviewScreen';
import HelpScreen from '../screens/HelpScreen';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {AppearanceProvider} from 'react-native-appearance';

const storeWrapped = (Component: React.FC<any>) => (props: any) => (
  <Provider store={store}>
    <AppearanceProvider>
      <Component {...props} />
    </AppearanceProvider>
  </Provider>
);

const registerScreens = () => {
  Navigation.registerComponent(
    'empty',
    () => storeWrapped(EmptyScreen),
    () => EmptyScreen,
  );

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
  Navigation.registerComponent(
    'notices.detail',
    () => storeWrapped(NoticeDetailScreen),
    () => NoticeDetailScreen,
  );

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
    () => storeWrapped(AssignmentDetailScreen),
    () => AssignmentDetailScreen,
  );

  Navigation.registerComponent(
    'courses.index',
    () => storeWrapped(CoursesScreen),
    () => CoursesScreen,
  );
  Navigation.registerComponent(
    'courses.detail',
    () => gestureHandlerRootHOC(storeWrapped(CourseDetailScreen)),
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
    () => storeWrapped(AcknowledgementsScreen),
    () => AcknowledgementsScreen,
  );
  Navigation.registerComponent(
    'settings.about',
    () => storeWrapped(AboutScreen),
    () => AboutScreen,
  );
  Navigation.registerComponent(
    'settings.help',
    () => storeWrapped(HelpScreen),
    () => HelpScreen,
  );

  Navigation.registerComponent(
    'webview',
    () => storeWrapped(FilePreviewScreen),
    () => FilePreviewScreen,
  );
};

export default registerScreens;
