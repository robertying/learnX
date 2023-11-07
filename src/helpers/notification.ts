import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import DeviceInfo from 'constants/DeviceInfo';
import {store} from 'data/store';
import {Assignment, File, Notice} from 'data/types/state';
import {getAllFilesForCoursesAction} from 'data/actions/files';
import {getAllAssignmentsForCoursesAction} from 'data/actions/assignments';
import {getAllNoticesForCoursesAction} from 'data/actions/notices';
import env from './env';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotifications = async () => {
  if (await DeviceInfo.isEmulator()) {
    return;
  }

  const {status: existingStatus} = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const {status} = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: env.EXPO_PROJECT_ID,
    })
  ).data;
  return token;
};

export const clearPushNotificationBadge = () => {
  Notifications.setBadgeCountAsync(0);
};

registerForPushNotifications();

const updateDataFromNotification = (data: any) => {
  const dispatch = store.dispatch;

  if ((data as File).fileType) {
    const file = data as File;
    const newFiles = [
      ...store.getState().files.items.filter(f => f.id !== file.id),
      file,
    ].sort((a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix());
    dispatch(getAllFilesForCoursesAction.success(newFiles));
  } else if ((data as Assignment).deadline) {
    const assignment = data as Assignment;
    const newAssignments = [
      ...store.getState().assignments.items.filter(a => a.id !== assignment.id),
      assignment,
    ].sort((a, b) => dayjs(b.deadline).unix() - dayjs(a.deadline).unix());
    dispatch(getAllAssignmentsForCoursesAction.success(newAssignments));
  } else {
    const notice = data as Notice;
    const newNotices = [
      ...store.getState().notices.items.filter(n => n.id !== notice.id),
      notice,
    ].sort((a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix());
    dispatch(getAllNoticesForCoursesAction.success(newNotices));
  }
};

Notifications.addNotificationReceivedListener(notification => {
  const payload = notification.request.content.data;
  if (!payload) {
    return;
  }

  updateDataFromNotification(payload);
});

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({data, error}) => {
  if (!data || error) {
    return;
  }
  const payload = (data as any).body;
  if (!payload) {
    return;
  }

  updateDataFromNotification(payload);
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
