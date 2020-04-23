import {Platform, UIManager, unstable_enableLogBox} from 'react-native';
import {Navigation} from 'react-native-navigation';
import * as Notifications from 'expo-notifications';
import DeviceInfo from './constants/DeviceInfo';
import {getAuthLoadingRoot} from './navigation/navigationRoot';
import registerComponents from './navigation/registerComponents';
import {Appearance} from 'react-native-appearance';
import {getAndroidTheme} from './helpers/darkmode';
import {registerBackgroundTasks} from './helpers/background';

unstable_enableLogBox();

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

registerBackgroundTasks();

const startApp = () => {
  Navigation.events().registerAppLaunchedListener(async () => {
    await DeviceInfo.init();

    registerComponents();

    const colorScheme = Appearance.getColorScheme();

    if (Platform.OS === 'android') {
      Navigation.setDefaultOptions(getAndroidTheme(colorScheme));
    } else {
      Navigation.setDefaultOptions({
        window: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
        layout: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
      } as any);
    }

    const authLoadingRoot = getAuthLoadingRoot();
    Navigation.setRoot(authLoadingRoot);
  });
};

export default startApp;
