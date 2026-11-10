import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getUserData, resetUserData } from 'data/userData';
import { flushServerActions, setFavorite } from 'data/serverActions';
import {
  cancelDeadlineRemindersOf,
  remindLater,
} from 'helpers/deadlineReminders';
import { handleNotificationAction } from 'helpers/notificationActions';
import { refreshSurfaces } from 'helpers/surfaces';

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('data/queryClient', () => ({
  restoreQueryCache: jest.fn(async () => {}),
}));
jest.mock('data/serverActions', () => ({
  setFavorite: jest.fn(),
  flushServerActions: jest.fn(async () => {}),
}));
jest.mock('helpers/deadlineReminders', () => ({
  cancelDeadlineRemindersOf: jest.fn(async () => {}),
  remindLater: jest.fn(async () => {}),
}));
jest.mock('helpers/surfaces', () => ({
  refreshSurfaces: jest.fn(async () => {}),
}));
jest.mock('helpers/crashReporting', () => ({ recordError: jest.fn() }));

const dismiss = jest.fn(async () => {});
(Notifications as unknown as Record<string, unknown>).dismissNotificationAsync =
  dismiss;

const response = (actionIdentifier: string, data: object) =>
  ({
    actionIdentifier,
    notification: {
      request: { identifier: 'notification-1', content: { data } },
    },
  }) as unknown as Notifications.NotificationResponse;

const os = Platform.OS;

beforeEach(() => {
  resetUserData();
});

afterEach(() => {
  Platform.OS = os;
});

it('leaves taps on the notification itself to the app', async () => {
  await handleNotificationAction(
    response(Notifications.DEFAULT_ACTION_IDENTIFIER, {
      type: 'notice',
      id: 'n1',
    }),
  );
  expect(setFavorite).not.toHaveBeenCalled();
  expect(getUserData().archived.notice).toEqual([]);
});

it('ignores notifications that are not ours', async () => {
  await handleNotificationAction(response('archive', { other: true }));
  expect(Object.values(getUserData().archived).flat()).toEqual([]);
  expect(dismiss).not.toHaveBeenCalled();
});

it('favorites the item and sends it when the app is not logged in', async () => {
  await handleNotificationAction(
    response('favorite', { type: 'notice', id: 'n1' }),
  );
  expect(setFavorite).toHaveBeenCalledWith('notice', 'n1', true);
  expect(flushServerActions).toHaveBeenCalledWith({ ensureSession: true });
});

it('archives all the items of a grouped notification', async () => {
  await handleNotificationAction(
    response('archive', { type: 'file', ids: ['f1', 'f2'] }),
  );
  expect(getUserData().archived.file).toEqual(['f1', 'f2']);
  expect(cancelDeadlineRemindersOf).not.toHaveBeenCalled();
});

it('cancels the reminders and refreshes the surfaces for assignments', async () => {
  await handleNotificationAction(
    response('archive', { type: 'assignment', id: 'a1' }),
  );
  expect(getUserData().archived.assignment).toEqual(['a1']);
  expect(cancelDeadlineRemindersOf).toHaveBeenCalledWith(['a1']);
  expect(refreshSurfaces).toHaveBeenCalled();
});

it('puts a reminder off', async () => {
  const later = response('remindLater', {
    type: 'assignment',
    id: 'a1',
    deadline: 123,
  });
  await handleNotificationAction(later);
  expect(remindLater).toHaveBeenCalledWith(later.notification, {
    id: 'a1',
    deadline: 123,
  });
});

it('dismisses the notification on Android only', async () => {
  await handleNotificationAction(
    response('archive', { type: 'notice', id: 'n1' }),
  );
  expect(dismiss).not.toHaveBeenCalled();

  Platform.OS = 'android';
  await handleNotificationAction(
    response('archive', { type: 'notice', id: 'n2' }),
  );
  expect(dismiss).toHaveBeenCalledWith('notification-1');
});
