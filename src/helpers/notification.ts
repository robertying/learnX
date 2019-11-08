import {
  Alert,
  Linking,
  PushNotificationPermissions,
  Platform,
  PushNotificationIOS,
} from 'react-native';
import {getTranslation} from './i18n';
import PushNotification from 'react-native-push-notification';

export const requestNotificationPermission = async () => {
  if (Platform.OS === 'ios') {
    const result = await PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
    });
    return result.alert;
  } else {
    await PushNotification.requestPermissions(['alert', 'badge', 'sound']);

    const result = await new Promise<PushNotificationPermissions>(resolve =>
      PushNotification.checkPermissions(value => resolve(value)),
    );

    return result.alert;
  }
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
  date: Date,
  userInfo?: Object,
) => {
  if (Platform.OS === 'ios') {
    PushNotificationIOS.scheduleLocalNotification({
      fireDate: date.toISOString(),
      alertTitle: title,
      alertBody: body,
      userInfo,
    });
  } else {
    PushNotification.localNotificationSchedule({
      date,
      title,
      message: body,
      userInfo,
    });
  }
};
