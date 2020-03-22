import React from 'react';
import {Navigation} from 'react-native-navigation';
import {Provider} from 'react-redux';
import EmptyScreen from '../components/EmptyScreen';
import {store} from '../redux/store';
import AboutScreen from '../screens/AboutScreen';
import AcknowledgementScreen from '../screens/AcknowledgementScreen';
import AssignmentDetailScreen from '../screens/AssignmentDetailScreen';
import AssignmentScreen from '../screens/AssignmentScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import CourseScreen from '../screens/CourseScreen';
import FileScreen from '../screens/FileScreen';
import LoginScreen from '../screens/LoginScreen';
import NoticeDetailScreen from '../screens/NoticeDetailScreen';
import NoticeScreen from '../screens/NoticeScreen';
import SemesterSettingScreen from '../screens/SemesterSettingScreen';
import SettingScreen from '../screens/SettingScreen';
import FilePreviewScreen from '../screens/FilePreviewScreen';
import HelpScreen from '../screens/HelpScreen';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {AppearanceProvider} from 'react-native-appearance';
import AssignmentSubmitScreen from '../screens/AssignmentSubmitScreen';
import PushNotificationScreen from '../screens/PushNotificationScreen';
import AgreementScreen from '../screens/AgreementScreen';
import FirebaseScreen from '../screens/FirebaseScreen';

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
    () => storeWrapped(NoticeScreen),
    () => NoticeScreen,
  );
  Navigation.registerComponent(
    'notices.detail',
    () => storeWrapped(NoticeDetailScreen),
    () => NoticeDetailScreen,
  );

  Navigation.registerComponent(
    'files.index',
    () => storeWrapped(FileScreen),
    () => FileScreen,
  );

  Navigation.registerComponent(
    'assignments.index',
    () => storeWrapped(AssignmentScreen),
    () => AssignmentScreen,
  );
  Navigation.registerComponent(
    'assignments.detail',
    () => storeWrapped(AssignmentDetailScreen),
    () => AssignmentDetailScreen,
  );

  Navigation.registerComponent(
    'courses.index',
    () => storeWrapped(CourseScreen),
    () => CourseScreen,
  );
  Navigation.registerComponent(
    'courses.detail',
    () => gestureHandlerRootHOC(storeWrapped(CourseDetailScreen)),
    () => CourseDetailScreen,
  );

  Navigation.registerComponent(
    'settings.index',
    () => storeWrapped(SettingScreen),
    () => SettingScreen,
  );
  Navigation.registerComponent(
    'settings.semesters',
    () => storeWrapped(SemesterSettingScreen),
    () => SemesterSettingScreen,
  );
  Navigation.registerComponent(
    'settings.acknowledgements',
    () => storeWrapped(AcknowledgementScreen),
    () => AcknowledgementScreen,
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
    'settings.pushNotifications',
    () => storeWrapped(PushNotificationScreen),
    () => PushNotificationScreen,
  );
  Navigation.registerComponent(
    'settings.pushNotifications.agreement',
    () => storeWrapped(AgreementScreen),
    () => AgreementScreen,
  );
  Navigation.registerComponent(
    'settings.pushNotifications.firebase',
    () => storeWrapped(FirebaseScreen),
    () => FirebaseScreen,
  );

  Navigation.registerComponent(
    'webview',
    () => storeWrapped(FilePreviewScreen),
    () => FilePreviewScreen,
  );

  Navigation.registerComponent(
    'assignment.submit',
    () => storeWrapped(AssignmentSubmitScreen),
    () => AssignmentSubmitScreen,
  );
};

export default registerScreens;
