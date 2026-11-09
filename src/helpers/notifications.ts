import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from 'helpers/i18n';
import { isItemType, ItemTarget } from 'helpers/openTarget';

/**
 * Action buttons a notification shows, by what it is about. Identifiers
 * mustn't contain `:` or `-`.
 */
export const notificationCategories = {
  /** One new or changed item: Favorite, Archive. */
  item: 'contentItem',
  /** Several items of one kind in one course: Archive All. */
  items: 'contentItems',
  /** A deadline reminder: Remind Later, Archive. */
  deadline: 'deadlineReminder',
} as const;

export const notificationActions = {
  favorite: 'favorite',
  archive: 'archive',
  remindLater: 'remindLater',
} as const;

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
 * Registers the action buttons, in the app's language. Actions that don't
 * open the app are handled by `helpers/notificationActions`.
 */
const setUpCategories = async () => {
  const inBackground = { opensAppToForeground: false };
  const archive = {
    identifier: notificationActions.archive,
    buttonTitle: t('archive'),
    options: inBackground,
  };
  // One at a time: expo-notifications reads, changes and writes the whole
  // set for each, so categories set at once overwrite each other.
  await Notifications.setNotificationCategoryAsync(
    notificationCategories.item,
    [
      {
        identifier: notificationActions.favorite,
        buttonTitle: t('favorite'),
        options: inBackground,
      },
      archive,
    ],
  );
  await Notifications.setNotificationCategoryAsync(
    notificationCategories.items,
    [{ ...archive, buttonTitle: t('notificationArchiveAll') }],
  );
  await Notifications.setNotificationCategoryAsync(
    notificationCategories.deadline,
    [
      {
        identifier: notificationActions.remindLater,
        buttonTitle: t('notificationRemindLater'),
        options: inBackground,
      },
      archive,
    ],
  );
};

/**
 * Shows notifications that arrive while the app is open, e.g. a deadline
 * reminder, and keeps the Android channel names and the action buttons in the
 * app's language.
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
  await Promise.allSettled([setUpChannels(), setUpCategories()]);
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

/**
 * Posts a notification now. `ids` are the items a notification about several
 * of them covers, for its Archive All button.
 */
export const postNotification = (
  content: {
    title: string;
    body: string;
    target: ItemTarget;
    ids?: string[];
  },
  channelId: string = notificationChannels.content,
) =>
  Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { ...content.target, ...(content.ids ? { ids: content.ids } : {}) },
      categoryIdentifier: content.target.id
        ? notificationCategories.item
        : content.ids?.length
          ? notificationCategories.items
          : undefined,
    },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });

/** What one of our notifications carries. */
export interface NotificationData extends ItemTarget {
  /** The items a notification about several of them covers. */
  ids?: string[];
  /** A deadline reminder's deadline, in milliseconds. */
  deadline?: number;
}

/**
 * The data of a notification response. A response that reaches the Android
 * background task isn't mapped by expo-notifications, and has the data as a
 * JSON string.
 */
const responseData = (
  response: Notifications.NotificationResponse,
): Record<string, unknown> | null => {
  const content = response.notification?.request?.content as
    | (Notifications.NotificationContent & { dataString?: string })
    | undefined;
  if (content?.data && typeof content.data === 'object') {
    return content.data as Record<string, unknown>;
  }
  if (typeof content?.dataString === 'string') {
    try {
      const data: unknown = JSON.parse(content.dataString);
      return data && typeof data === 'object'
        ? (data as Record<string, unknown>)
        : null;
    } catch {}
  }
  return null;
};

/** The data a notification carries, if it is one of ours. */
export const getNotificationData = (
  response: Notifications.NotificationResponse,
): NotificationData | null => {
  const data = responseData(response);
  if (!data || typeof data.type !== 'string' || !isItemType(data.type)) {
    return null;
  }
  return {
    type: data.type as ItemTarget['type'],
    id: typeof data.id === 'string' ? data.id : undefined,
    ids:
      Array.isArray(data.ids) && data.ids.every(id => typeof id === 'string')
        ? (data.ids as string[])
        : undefined,
    deadline: typeof data.deadline === 'number' ? data.deadline : undefined,
  };
};

/** The target a notification carries, if it is one of ours. */
export const getNotificationTarget = (
  response: Notifications.NotificationResponse,
): ItemTarget | null => {
  const data = getNotificationData(response);
  return data ? { type: data.type, id: data.id } : null;
};
