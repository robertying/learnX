import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from 'helpers/i18n';

/** What a tap on a notification or a widget row opens. */
export interface NotificationTarget {
  type: 'notice' | 'assignment' | 'file';
  /** The item to open; without it, the type's list. */
  id?: string;
}

/** Android channels, so users can mute new content and keep reminders. */
export const notificationChannels = {
  content: 'content',
  deadlines: 'deadlines',
} as const;

export type NotificationPermission = 'granted' | 'undetermined' | 'denied';

const toPermission = (
  response: Notifications.NotificationPermissionsStatus,
): NotificationPermission => {
  if (
    response.granted ||
    response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'granted';
  }
  return response.canAskAgain ? 'undetermined' : 'denied';
};

/**
 * Creates the Android channels. Android 13 only asks for the permission once
 * a channel exists.
 */
const setUpChannels = async () => {
  if (Platform.OS !== 'android') {
    return;
  }
  await Promise.all([
    Notifications.setNotificationChannelAsync(notificationChannels.content, {
      name: t('notificationChannelContent'),
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync(notificationChannels.deadlines, {
      name: t('notificationChannelDeadlines'),
      importance: Notifications.AndroidImportance.HIGH,
    }),
  ]);
};

/**
 * Shows notifications that arrive while the app is open, e.g. a deadline
 * reminder, and keeps the Android channel names in the app's language.
 */
export const configureNotifications = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  try {
    await setUpChannels();
  } catch {}
};

export const getNotificationPermission = async () =>
  toPermission(await Notifications.getPermissionsAsync());

/** Asks for the permission if the system still lets the app ask. */
export const requestNotificationPermission = async () => {
  await setUpChannels();
  return toPermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
};

/** Posts a notification now. */
export const postNotification = (
  content: { title: string; body: string; target: NotificationTarget },
  channelId: string = notificationChannels.content,
) =>
  Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { ...content.target },
    },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });

const targetTypes = new Set<string>(['notice', 'assignment', 'file']);

/** The target a notification carries, if it is one of ours. */
export const getNotificationTarget = (
  response: Notifications.NotificationResponse,
): NotificationTarget | null => {
  const data = response.notification.request.content.data as Record<
    string,
    unknown
  > | null;
  if (!data || typeof data.type !== 'string' || !targetTypes.has(data.type)) {
    return null;
  }
  return {
    type: data.type as NotificationTarget['type'],
    id: typeof data.id === 'string' ? data.id : undefined,
  };
};

/**
 * The learnx:// link that opens a target, e.g. `learnx://assignment/<id>` for
 * a widget row. Without an id, it opens the type's list.
 */
export const getTargetUrl = ({ type, id }: NotificationTarget) =>
  `learnx://${type}${id ? `/${encodeURIComponent(id)}` : ''}`;

/** The target of a learnx:// link, if it points to one. */
export const getUrlTarget = (url: string): NotificationTarget | null => {
  const match = /^learnx:\/\/([a-z]+)(?:\/([^/?#]+))?\/?(?:[?#].*)?$/i.exec(
    url,
  );
  if (!match || !targetTypes.has(match[1])) {
    return null;
  }
  try {
    return {
      type: match[1] as NotificationTarget['type'],
      id: match[2] ? decodeURIComponent(match[2]) : undefined,
    };
  } catch {
    return null;
  }
};
