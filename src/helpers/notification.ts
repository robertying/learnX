import {PushNotificationIOS, Alert, Linking} from 'react-native';
import {getTranslation} from './i18n';

export const requestNotificationPermission = async () => {
  const result = await PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true,
  });
  return result.alert;
};

export const showNotificationPermissionAlert = () => {
  Alert.alert(
    getTranslation('pushNotification'),
    getTranslation('pushNotificationReminder'),
    [
      {
        text: getTranslation('cancel'),
        style: 'cancel',
      },
      {
        text: getTranslation('goToSettings'),
        onPress: () => Linking.openURL('app-settings:'),
      },
    ],
    {cancelable: false},
  );
};

export const scheduleNotification = (
  title: string,
  body: string,
  date: string,
  userInfo?: Object,
) => {
  PushNotificationIOS.scheduleLocalNotification({
    fireDate: date,
    alertTitle: title,
    alertBody: body,
    userInfo,
  });
};
