import {Alert, Linking, Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {getTranslation} from './i18n';

export const serviceUrl = 'https://app.robertying.io/api';

export const requestNotificationPermission = async () => {
  const {status} = await Notifications.requestPermissionsAsync();
  return status;
};

export const showNotificationPermissionAlert = () => {
  Alert.alert(
    getTranslation('pushNotifications'),
    getTranslation('pushNotificationReminder'),
    [
      {
        text: getTranslation('cancel'),
        style: 'cancel',
      },
      {
        text: getTranslation('goToSettings'),
        onPress: () =>
          Platform.OS === 'ios' && Linking.openURL('app-settings:'),
      },
    ],
    {cancelable: false},
  );
};

export const scheduleNotification = async (
  title: string,
  body: string,
  date: Date,
  userInfo?: any,
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      badge: 1,
      sound: true,
      vibrate: [0],
      priority: 'high',
      data: userInfo,
    },
    trigger: date,
  });
};
