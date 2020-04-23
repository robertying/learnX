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
import CalendarScreen from '../screens/CalendarScreen';

const wrapped = (Component: React.FC<any>) =>
  gestureHandlerRootHOC((props: any) => (
    <Provider store={store}>
      <AppearanceProvider>
        <Component {...props} />
      </AppearanceProvider>
    </Provider>
  ));

const registerScreens = () => {
  Navigation.registerComponent(
    'empty',
    () => wrapped(EmptyScreen),
    () => EmptyScreen,
  );

  Navigation.registerComponent(
    'auth.loading',
    () => wrapped(AuthLoadingScreen),
    () => AuthLoadingScreen,
  );

  Navigation.registerComponent(
    'login',
    () => wrapped(LoginScreen),
    () => LoginScreen,
  );

  Navigation.registerComponent(
    'notices.index',
    () => wrapped(NoticeScreen),
    () => NoticeScreen,
  );
  Navigation.registerComponent(
    'notices.detail',
    () => wrapped(NoticeDetailScreen),
    () => NoticeDetailScreen,
  );

  Navigation.registerComponent(
    'files.index',
    () => wrapped(FileScreen),
    () => FileScreen,
  );

  Navigation.registerComponent(
    'assignments.index',
    () => wrapped(AssignmentScreen),
    () => AssignmentScreen,
  );
  Navigation.registerComponent(
    'assignments.detail',
    () => wrapped(AssignmentDetailScreen),
    () => AssignmentDetailScreen,
  );

  Navigation.registerComponent(
    'courses.index',
    () => wrapped(CourseScreen),
    () => CourseScreen,
  );
  Navigation.registerComponent(
    'courses.detail',
    () => wrapped(CourseDetailScreen),
    () => CourseDetailScreen,
  );

  Navigation.registerComponent(
    'settings.index',
    () => wrapped(SettingScreen),
    () => SettingScreen,
  );
  Navigation.registerComponent(
    'settings.semesters',
    () => wrapped(SemesterSettingScreen),
    () => SemesterSettingScreen,
  );
  Navigation.registerComponent(
    'settings.acknowledgements',
    () => wrapped(AcknowledgementScreen),
    () => AcknowledgementScreen,
  );
  Navigation.registerComponent(
    'settings.about',
    () => wrapped(AboutScreen),
    () => AboutScreen,
  );
  Navigation.registerComponent(
    'settings.help',
    () => wrapped(HelpScreen),
    () => HelpScreen,
  );
  Navigation.registerComponent(
    'settings.pushNotifications',
    () => wrapped(PushNotificationScreen),
    () => PushNotificationScreen,
  );
  Navigation.registerComponent(
    'settings.pushNotifications.agreement',
    () => wrapped(AgreementScreen),
    () => AgreementScreen,
  );
  Navigation.registerComponent(
    'settings.pushNotifications.firebase',
    () => wrapped(FirebaseScreen),
    () => FirebaseScreen,
  );
  Navigation.registerComponent(
    'settings.calendar',
    () => wrapped(CalendarScreen),
    () => CalendarScreen,
  );

  Navigation.registerComponent(
    'webview',
    () => wrapped(FilePreviewScreen),
    () => FilePreviewScreen,
  );

  Navigation.registerComponent(
    'assignment.submit',
    () => wrapped(AssignmentSubmitScreen),
    () => AssignmentSubmitScreen,
  );
};

export default registerScreens;
