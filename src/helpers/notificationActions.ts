import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { assignmentsQuery } from 'data/content';
import { queryClient, restoreQueryCache } from 'data/queryClient';
import { getUserData, setArchived, setFavorite } from 'data/userData';
import { recordError } from 'helpers/crashReporting';
import {
  cancelDeadlineRemindersOf,
  remindLater,
} from 'helpers/deadlineReminders';
import {
  getNotificationData,
  notificationActions,
} from 'helpers/notifications';
import { updateDeadlineWidget } from 'widgets';

/**
 * Keeps the widget and the reminders in step with archived assignments. The
 * app's hooks do this while it runs; this covers an action handled while it
 * doesn't. iOS gives an app it launches for an action only a few seconds, so
 * this may not finish there; the next sync or app launch then cancels the
 * reminders instead.
 */
const afterArchivingAssignments = async (ids: string[]) => {
  await cancelDeadlineRemindersOf(ids);
  await restoreQueryCache();
  const { currentSemester, hiddenCourses, archived } = getUserData();
  const assignments =
    currentSemester &&
    queryClient.getQueryData(assignmentsQuery(currentSemester).queryKey);
  if (assignments) {
    updateDeadlineWidget(assignments, {
      hiddenCourses,
      archived: archived.assignment,
    });
  }
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
        setFavorite(data.type, data.id, true);
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

// Android runs this for an action button while the app is in the background
// or not running, in a JS runtime of its own.
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
