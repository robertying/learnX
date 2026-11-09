import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { restoreQueryCache } from 'data/queryClient';
import { getAuth } from 'data/auth';
import { flushServerActions, setFavorite } from 'data/serverActions';
import { setArchived } from 'data/userData';
import { recordError } from 'helpers/crashReporting';
import {
  cancelDeadlineRemindersOf,
  remindLater,
} from 'helpers/deadlineReminders';
import {
  getNotificationData,
  notificationActions,
} from 'helpers/notifications';
import { refreshSurfaces } from 'helpers/surfaces';

/**
 * Keeps the widgets, Spotlight and the reminders in step with archived
 * assignments, as the app does by itself, but waiting for it: iOS gives an
 * app it launches for an action only a few seconds. The reminders go first;
 * if the rest doesn't finish, the next sync or app launch does it.
 */
const afterArchivingAssignments = async (ids: string[]) => {
  await cancelDeadlineRemindersOf(ids);
  await restoreQueryCache();
  await refreshSurfaces();
};

/**
 * Does what a notification's action button asks: Favorite, Archive (All) or
 * Remind Later. Taps on the notification itself are left to the app.
 */
export const handleNotificationAction = async (
  response: Notifications.NotificationResponse,
) => {
  const { actionIdentifier } = response;
  if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }
  const data = getNotificationData(response);
  if (!data) {
    return;
  }
  const ids = data.id ? [data.id] : (data.ids ?? []);

  switch (actionIdentifier) {
    case notificationActions.favorite:
      if (data.id) {
        // The cached list gets the heart too, when the app isn't running.
        await restoreQueryCache();
        setFavorite(data.type, data.id, true);
        if (!getAuth().loggedIn && AppState.currentState !== 'active') {
          // Handled without the app: one try, logging in if needed. If it
          // fails, it waits for the app or the next background sync.
          await flushServerActions({ ensureSession: true });
        }
      }
      break;
    case notificationActions.archive:
      if (ids.length > 0) {
        setArchived(data.type, ids, true);
        if (data.type === 'assignment') {
          await afterArchivingAssignments(ids);
        }
      }
      break;
    case notificationActions.remindLater:
      if (data.id && data.deadline !== undefined) {
        await remindLater(response.notification, {
          id: data.id,
          deadline: data.deadline,
        });
      }
      break;
    default:
      return;
  }

  // Android leaves the notification up after an action button.
  if (Platform.OS === 'android') {
    await Notifications.dismissNotificationAsync(
      response.notification.request.identifier,
    );
  }
};

const handle = (response: Notifications.NotificationResponse) =>
  handleNotificationAction(response).catch(error =>
    recordError(error, 'Handling a notification action'),
  );

const NOTIFICATION_ACTION_TASK = 'NOTIFICATION_ACTION_TASK';

// Android runs this for an action button pressed while the app is in the
// background (in its JS runtime) or not running (in a headless one).
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  NOTIFICATION_ACTION_TASK,
  async ({ data }) => {
    if (data && 'actionIdentifier' in data) {
      await handle(data);
    }
  },
);

/**
 * Handles action buttons from now on: those pressed while the app runs, and
 * on iOS the one that launched the app in the background, which the system
 * hands over as the last response.
 */
export const setUpNotificationActions = () => {
  const last = Notifications.getLastNotificationResponse();
  if (
    last &&
    last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    void handle(last);
    Notifications.clearLastNotificationResponse();
  }
  const subscription =
    Notifications.addNotificationResponseReceivedListener(handle);
  if (Platform.OS === 'android') {
    Notifications.registerTaskAsync(NOTIFICATION_ACTION_TASK).catch(error =>
      recordError(error, 'Registering the notification action task'),
    );
  }
  return subscription;
};
