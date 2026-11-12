import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { initialAuth, useAuthStore } from 'data/auth';
import { getUserData, resetUserData } from 'data/userData';
import { flushServerActions, setFavorite } from 'data/serverActions';
import {
  cancelDeadlineRemindersOf,
  remindLater,
} from 'services/deadlineReminders';
import { recordError } from 'services/crashReporting';
import {
  handleNotificationAction,
  setUpNotificationActions,
} from 'services/notificationActions';
import { refreshSurfaces } from 'services/surfaces';

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
// Defined on import, before clearMocks wipes the call.
const actionTask = jest.mocked(TaskManager.defineTask).mock.calls[0][1];
jest.mock('data/queryClient', () => ({
  restoreQueryCache: jest.fn(async () => {}),
}));
jest.mock('data/serverActions', () => ({
  setFavorite: jest.fn(),
  flushServerActions: jest.fn(async () => {}),
}));
jest.mock('services/deadlineReminders', () => ({
  cancelDeadlineRemindersOf: jest.fn(async () => {}),
  remindLater: jest.fn(async () => {}),
  isReminderKind: jest.requireActual('services/deadlineReminders')
    .isReminderKind,
}));
jest.mock('services/surfaces', () => ({
  refreshSurfaces: jest.fn(async () => {}),
}));
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

const dismiss = jest.mocked(Notifications.dismissNotificationAsync);

const response = (actionIdentifier: string, data: object) =>
  ({
    actionIdentifier,
    notification: {
      request: { identifier: 'notification-1', content: { data } },
    },
  }) as unknown as Notifications.NotificationResponse;

const os = Platform.OS;
const appState = AppState.currentState;

beforeEach(() => {
  resetUserData();
});

afterEach(() => {
  Platform.OS = os;
  AppState.currentState = appState;
  useAuthStore.setState(initialAuth);
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

it('puts a reminder off, keeping its kind', async () => {
  const later = response('remindLater', {
    type: 'assignment',
    id: 'a1',
    deadline: 123,
    kind: 'lateDue',
  });
  await handleNotificationAction(later);
  expect(remindLater).toHaveBeenCalledWith(later.notification, {
    id: 'a1',
    deadline: 123,
    kind: 'lateDue',
  });

  await handleNotificationAction(
    response('remindLater', {
      type: 'assignment',
      id: 'a1',
      deadline: 123,
      kind: 'other',
    }),
  );
  expect(jest.mocked(remindLater).mock.calls[1][1]).toEqual({
    id: 'a1',
    deadline: 123,
    kind: undefined,
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

it('leaves sending a favorite to the app when it can', async () => {
  AppState.currentState = 'active';
  await handleNotificationAction(
    response('favorite', { type: 'notice', id: 'n1' }),
  );
  expect(setFavorite).toHaveBeenCalledWith('notice', 'n1', true);
  expect(flushServerActions).not.toHaveBeenCalled();

  AppState.currentState = 'background';
  useAuthStore.setState({ loggedIn: true });
  await handleNotificationAction(
    response('favorite', { type: 'notice', id: 'n2' }),
  );
  expect(flushServerActions).not.toHaveBeenCalled();
});

it('ignores unknown actions and incomplete data', async () => {
  Platform.OS = 'android';
  await handleNotificationAction(
    response('reply', { type: 'notice', id: 'n1' }),
  );
  expect(dismiss).not.toHaveBeenCalled();

  await handleNotificationAction(
    response('favorite', { type: 'file', ids: ['f1'] }),
  );
  await handleNotificationAction(
    response('remindLater', { type: 'assignment', id: 'a1' }),
  );
  expect(setFavorite).not.toHaveBeenCalled();
  expect(remindLater).not.toHaveBeenCalled();
});

describe('setUpNotificationActions', () => {
  const lastResponse = jest.mocked(Notifications.getLastNotificationResponse);
  const addListener = jest.mocked(
    Notifications.addNotificationResponseReceivedListener,
  );
  const registerTask = jest.mocked(Notifications.registerTaskAsync);

  it('handles the action that launched the app and later ones', async () => {
    Platform.OS = 'ios';
    lastResponse.mockReturnValue(
      response('archive', { type: 'notice', id: 'n1' }),
    );
    setUpNotificationActions();
    await new Promise(process.nextTick);
    expect(getUserData().archived.notice).toEqual(['n1']);
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
    expect(registerTask).not.toHaveBeenCalled();

    const listener = addListener.mock.calls[0][0];
    listener(response('archive', { type: 'notice', id: 'n2' }));
    await new Promise(process.nextTick);
    expect(getUserData().archived.notice).toEqual(['n1', 'n2']);
  });

  it('leaves a launching tap to the app', () => {
    lastResponse.mockReturnValue(
      response(Notifications.DEFAULT_ACTION_IDENTIFIER, {
        type: 'notice',
        id: 'n1',
      }),
    );
    setUpNotificationActions();
    expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
  });

  it('registers the background task on Android and records failures', async () => {
    Platform.OS = 'android';
    lastResponse.mockReturnValue(null);
    registerTask.mockRejectedValueOnce(new Error('no task'));
    setUpNotificationActions();
    expect(registerTask).toHaveBeenCalledWith('NOTIFICATION_ACTION_TASK');
    await new Promise(process.nextTick);
    expect(recordError).toHaveBeenCalledWith(
      new Error('no task'),
      'Registering the notification action task',
    );
  });
});

describe('the Android background task', () => {
  it('handles action responses and records their errors', async () => {
    await actionTask({
      data: response('archive', { type: 'notice', id: 'n1' }),
      error: null,
      executionInfo: {} as never,
    });
    expect(getUserData().archived.notice).toEqual(['n1']);

    jest.mocked(remindLater).mockRejectedValueOnce(new Error('failed'));
    await actionTask({
      data: response('remindLater', {
        type: 'assignment',
        id: 'a',
        deadline: 1,
      }),
      error: null,
      executionInfo: {} as never,
    });
    expect(recordError).toHaveBeenCalledWith(
      new Error('failed'),
      'Handling a notification action',
    );
  });

  it('ignores other payloads', async () => {
    await actionTask({
      data: { notification: {} } as never,
      error: null,
      executionInfo: {} as never,
    });
    expect(Object.values(getUserData().archived).flat()).toEqual([]);
  });
});
