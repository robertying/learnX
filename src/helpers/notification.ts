import PushNotification from "react-native-push-notification";

export const sendLocalNotification = (
  title: string | undefined,
  message: string
) => {
  PushNotification.localNotification({
    userInfo: {},
    title,
    message
  });
};
