import {Alert, Linking, Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import DeviceInfo from 'react-native-device-info';
import {getTranslation} from './i18n';
import {store} from '../redux/store';

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

export const updateFirebaseUser = async (info: {
  username?: string;
  password?: string;
  hiddenCourses?: string[];
}) => {
  const state = store.getState();
  const settings = state.settings;
  const firebaseAuth = state.auth.firebase;

  if (
    !settings.pushNotifications.enabled ||
    !settings.pushNotifications.deviceToken
  ) {
    return;
  }

  if (!firebaseAuth || !firebaseAuth.refreshToken) {
    return;
  }

  let response = await fetch(`${serviceUrl}/users/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: firebaseAuth.refreshToken,
    }),
  });
  const result = await response.json();
  const idToken = result.id_token;

  response = await fetch(`${serviceUrl}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    },
    body: JSON.stringify(info),
  });

  if (!response.ok) {
    throw new Error();
  }
};

export const updateDeviceToken = async (token: string) => {
  const state = store.getState();
  const settings = state.settings;
  const firebaseAuth = state.auth.firebase;

  if (!settings.pushNotifications.enabled) {
    return;
  }

  if (!firebaseAuth || !firebaseAuth.refreshToken) {
    return;
  }

  let response = await fetch(`${serviceUrl}/users/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: firebaseAuth.refreshToken,
    }),
  });
  const result = await response.json();
  const idToken = result.id_token;

  response = await fetch(`${serviceUrl}/users/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    },
    body: JSON.stringify({
      uuid: DeviceInfo.getUniqueId(),
      token,
      sandbox: __DEV__ ? 'true' : 'false',
      os: Platform.OS,
    }),
  });

  if (!response.ok) {
    throw new Error();
  }
};
