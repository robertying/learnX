import { act, renderHook } from '@testing-library/react-native';
import Share from 'web/packages/share';
import type { BridgeNotificationRequest } from 'web/bridge';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';
// Loaded with the app's React for the hook; outside the Electron app (no
// bridge yet), so it listens for nothing until a test says.
import * as Notifications from 'web/packages/notifications';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));

afterEach(() => {
  uninstallBridge();
});

it('has no share sheet', async () => {
  await expect(Share.open()).rejects.toThrow('No share sheet');
});

/** The notifications stand-in, fresh, on a new bridge. */
const loadNotifications = () => {
  const bridge = installBridge();
  let notifications!: typeof import('web/packages/notifications');
  jest.isolateModules(() => {
    notifications = require('web/packages/notifications');
  });
  const respond = jest.mocked(bridge.notifications.onResponse).mock.calls[0][0];
  const devShown = jest.mocked(bridge.notifications.onDevShown).mock
    .calls[0][0];
  return { bridge, notifications, respond, devShown };
};

describe('notifications', () => {
  it('are allowed wherever the system shows them, with no prompt', async () => {
    const { bridge, notifications } = loadNotifications();
    await expect(notifications.getPermissionsAsync()).resolves.toMatchObject({
      granted: true,
      status: 'granted',
      canAskAgain: false,
    });
    jest.mocked(bridge.notifications.supported).mockResolvedValue(false);
    await expect(
      notifications.requestPermissionsAsync(),
    ).resolves.toMatchObject({ granted: false, status: 'denied' });
    await expect(
      notifications.getExactAlarmPermissionsAsync(),
    ).resolves.toMatchObject({ granted: true });
    await expect(
      notifications.requestExactAlarmPermissionsAsync(),
    ).resolves.toMatchObject({ granted: true });
  });

  it('go to the main process, with dates as milliseconds', async () => {
    const { bridge, notifications } = loadNotifications();
    const content = { title: 'T', subtitle: undefined, body: 'B' };
    await notifications.scheduleNotificationAsync({
      identifier: 'r',
      content,
      trigger: {
        type: 'date',
        date: new Date('2026-11-17T00:00:00Z'),
        channelId: 'deadlines',
      },
    });
    expect(bridge.notifications.schedule).toHaveBeenLastCalledWith({
      identifier: 'r',
      content: { title: 'T', body: 'B' },
      trigger: { type: 'date', date: Date.parse('2026-11-17T00:00:00Z') },
    });
    await notifications.scheduleNotificationAsync({
      content,
      trigger: { type: 'timeInterval', seconds: 60 },
    });
    expect(bridge.notifications.schedule).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identifier: expect.stringMatching(/^learnx-/),
        trigger: { type: 'timeInterval', seconds: 60 },
      }),
    );
    // Right away: no trigger, or only Android's channel.
    await notifications.scheduleNotificationAsync({ content, trigger: null });
    await notifications.scheduleNotificationAsync({
      content,
      trigger: { channelId: 'content' },
    });
    await notifications.scheduleNotificationAsync({ content });
    for (const call of jest
      .mocked(bridge.notifications.schedule)
      .mock.calls.slice(-3)) {
      expect(call[0].trigger).toBeNull();
    }
  });

  it('lists and cancels the ones waiting', async () => {
    const { bridge, notifications } = loadNotifications();
    const waiting = [
      {
        identifier: 'a',
        content: {},
        trigger: { type: 'date' as const, value: 1 },
      },
      {
        identifier: 'b',
        content: {},
        trigger: { type: 'date' as const, value: 2 },
      },
    ];
    jest.mocked(bridge.notifications.list).mockResolvedValue(waiting);
    await expect(
      notifications.getAllScheduledNotificationsAsync(),
    ).resolves.toEqual(waiting);
    await notifications.cancelScheduledNotificationAsync('a');
    expect(bridge.notifications.cancel).toHaveBeenCalledWith('a');
    await notifications.cancelAllScheduledNotificationsAsync();
    expect(bridge.notifications.cancel).toHaveBeenCalledWith('b');
  });

  it('have no channels, categories or handler to set', async () => {
    const { notifications } = loadNotifications();
    await expect(notifications.dismissNotificationAsync()).resolves.toBe(
      undefined,
    );
    await expect(notifications.setNotificationChannelAsync()).resolves.toBe(
      null,
    );
    await expect(notifications.setNotificationCategoryAsync()).resolves.toBe(
      null,
    );
    await expect(notifications.registerTaskAsync()).resolves.toBeNull();
    expect(notifications.setNotificationHandler()).toBeUndefined();
    expect(notifications.SchedulableTriggerInputTypes.DATE).toBe('date');
    expect(notifications.AndroidImportance.HIGH).toBe(6);
    expect(notifications.IosAuthorizationStatus.DENIED).toBe(1);
  });

  it('report a click as a tap, to the hook and the listeners', async () => {
    const notifications = Notifications;
    const respond = notifications.receiveResponse;
    const { result } = await renderHook(() =>
      notifications.useLastNotificationResponse(),
    );
    expect(result.current).toBeNull();
    const listener = jest.fn();
    const subscription =
      notifications.addNotificationResponseReceivedListener(listener);

    const request: BridgeNotificationRequest = {
      identifier: 'n',
      content: { title: 'T', data: { type: 'notice', id: '1' } },
      trigger: null,
    };
    await act(async () => respond(request));
    const response = {
      actionIdentifier: notifications.DEFAULT_ACTION_IDENTIFIER,
      notification: { date: expect.any(Number), request },
    };
    expect(result.current).toEqual(response);
    expect(notifications.getLastNotificationResponse()).toEqual(response);
    await expect(
      notifications.getLastNotificationResponseAsync(),
    ).resolves.toEqual(response);
    expect(listener).toHaveBeenCalledWith(response);

    await act(async () => notifications.clearLastNotificationResponse());
    expect(result.current).toBeNull();
    await act(() => notifications.clearLastNotificationResponseAsync());
    subscription.remove();
    await act(async () => respond(request));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('shows a dev run’s logged ones as toasts, listening once', () => {
    const { bridge, notifications, devShown } = loadNotifications();
    const { toast } = jest.requireMock('components/Toast');
    devShown({ title: 'T', subtitle: 'Course', body: 'One\nTwo' });
    expect(toast).toHaveBeenCalledWith('T · Course · One · Two', 'none');
    notifications.listenForResponses();
    expect(bridge.notifications.onResponse).toHaveBeenCalledTimes(1);
  });

  it('listen for nothing outside the Electron app', () => {
    let notifications!: typeof import('web/packages/notifications');
    jest.isolateModules(() => {
      notifications = require('web/packages/notifications');
    });
    expect(notifications.getLastNotificationResponse()).toBeNull();
  });
});

describe('background task', () => {
  const load = () => {
    const bridge = installBridge();
    let task!: typeof import('web/packages/backgroundTask');
    let manager!: typeof import('web/packages/taskManager');
    jest.isolateModules(() => {
      manager = require('web/packages/taskManager');
      task = require('web/packages/backgroundTask');
    });
    return { bridge, task, manager };
  };

  it('runs a registered task when the main process says, one at a time', async () => {
    const { bridge, task, manager } = load();
    let finish = () => {};
    const body = jest.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );
    manager.defineTask('SYNC', body);
    expect(manager.isTaskDefined('SYNC')).toBe(true);
    await expect(manager.isTaskRegisteredAsync('SYNC')).resolves.toBe(true);
    await expect(task.getStatusAsync()).resolves.toBe(
      task.BackgroundTaskStatus.Available,
    );

    await task.registerTaskAsync('SYNC', { minimumInterval: 15 });
    await task.registerTaskAsync('SYNC');
    expect(bridge.background.start).toHaveBeenCalledWith(15);
    expect(bridge.background.onRun).toHaveBeenCalledTimes(1);
    const run = jest.mocked(bridge.background.onRun).mock.calls[0][0];

    run({ manual: false });
    run({ manual: true });
    expect(body).toHaveBeenCalledTimes(1);
    expect(body).toHaveBeenCalledWith({ data: null, error: null });
    finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    const second = task.triggerTaskWorkerForTestingAsync();
    expect(body).toHaveBeenCalledTimes(2);
    finish();
    await second;
  });

  it('logs a task that fails, and runs nothing unregistered', async () => {
    const { task, manager } = load();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await task.triggerTaskWorkerForTestingAsync();
    await task.registerTaskAsync('MISSING');
    await task.triggerTaskWorkerForTestingAsync();
    expect(warn).toHaveBeenCalledWith(
      'Background task failed',
      expect.any(Error),
    );
    await expect(manager.runTask('MISSING')).rejects.toThrow("isn't defined");
    await task.unregisterTaskAsync();
    await manager.unregisterTaskAsync();
    await manager.unregisterAllTasksAsync();
    warn.mockClear();
    await task.triggerTaskWorkerForTestingAsync();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('pickers', () => {
  const picked = [
    {
      uri: 'file:///c/picked/1/a.pdf',
      name: 'a.pdf',
      size: 3,
      mimeType: 'application/pdf',
    },
    { uri: 'file:///c/picked/1/b', name: 'b', size: 1, mimeType: null },
  ];

  it('picks documents in the system dialog', async () => {
    const bridge = installBridge();
    const { getDocumentAsync } = require('web/packages/documentPicker');
    jest.mocked(bridge.shell.pickFiles).mockResolvedValueOnce(picked);
    await expect(getDocumentAsync({ multiple: true })).resolves.toEqual({
      canceled: false,
      assets: [
        {
          uri: picked[0].uri,
          name: 'a.pdf',
          size: 3,
          mimeType: 'application/pdf',
        },
        { uri: picked[1].uri, name: 'b', size: 1, mimeType: undefined },
      ],
    });
    expect(bridge.shell.pickFiles).toHaveBeenCalledWith({ multiple: true });
    await expect(getDocumentAsync()).resolves.toEqual({
      canceled: true,
      assets: null,
    });
  });

  it('picks pictures in the system dialog, with no camera', async () => {
    const bridge = installBridge();
    const picker = require('web/packages/imagePicker');
    jest.mocked(bridge.shell.pickFiles).mockResolvedValueOnce(picked);
    const result = await picker.launchImageLibraryAsync({
      mediaTypes: ['images'],
    });
    expect(bridge.shell.pickFiles).toHaveBeenCalledWith({
      images: true,
      multiple: false,
    });
    expect(result.assets[0]).toEqual({
      uri: picked[0].uri,
      fileName: 'a.pdf',
      fileSize: 3,
      mimeType: 'application/pdf',
      width: 0,
      height: 0,
    });
    expect(result.assets[1].mimeType).toBeUndefined();
    await expect(picker.launchImageLibraryAsync()).resolves.toEqual({
      canceled: true,
      assets: null,
    });
    await expect(picker.launchCameraAsync()).resolves.toEqual({
      canceled: true,
      assets: null,
    });
  });
});
