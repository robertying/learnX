import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  canScheduleExactAlarms,
  configureNotifications,
  getNotificationData,
  getNotificationPermission,
  getNotificationTarget,
  postNotification,
  requestExactAlarms,
  requestNotificationPermission,
} from 'services/notifications';
import { getTargetUrl, getUrlTarget } from 'helpers/openTarget';

const response = (data: unknown) =>
  ({
    actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
    notification: { request: { content: { data } } },
  }) as unknown as Notifications.NotificationResponse;

describe('getNotificationTarget', () => {
  it('reads the item a notification points to', () => {
    expect(
      getNotificationTarget(response({ type: 'notice', id: 'n1' })),
    ).toEqual({ type: 'notice', id: 'n1' });
    expect(getNotificationTarget(response({ type: 'file' }))).toEqual({
      type: 'file',
      id: undefined,
    });
  });

  it('opens the course or Today from a class reminder', () => {
    expect(getNotificationTarget(response({ type: 'today' }))).toEqual({
      type: 'today',
    });
    expect(
      getNotificationTarget(response({ type: 'course', id: 'c1' })),
    ).toEqual({ type: 'course', id: 'c1' });
  });

  it("ignores notifications that aren't ours", () => {
    expect(getNotificationTarget(response(null))).toBeNull();
    expect(getNotificationTarget(response({ type: 'class' }))).toBeNull();
    expect(getNotificationTarget(response({ url: 'https://x' }))).toBeNull();
  });
});

describe('learnx:// links', () => {
  it('round-trips items, lists and Today', () => {
    for (const target of [
      { type: 'assignment', id: 'a/b' },
      { type: 'notice', id: undefined },
      { type: 'today', id: undefined },
    ] as const) {
      expect(getUrlTarget(getTargetUrl(target))).toEqual(target);
    }
    expect(getTargetUrl({ type: 'today' })).toBe('learnx://today');
  });

  it('ignores other links', () => {
    expect(getUrlTarget('learnx://share')).toBeNull();
    expect(getUrlTarget('https://learn.tsinghua.edu.cn')).toBeNull();
  });
});

describe('permission', () => {
  it('is undetermined until asked, and denied once the system stops asking', async () => {
    expect(await getNotificationPermission()).toBe('undetermined');
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, canAskAgain: false } as never);
    expect(await getNotificationPermission()).toBe('denied');
  });

  it('counts provisional iOS authorization as granted', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
      ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL },
    } as never);
    expect(await getNotificationPermission()).toBe('granted');
  });

  it('creates the Android channels before asking', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(await requestNotificationPermission()).toBe('granted');
    const channels = jest
      .mocked(Notifications.setNotificationChannelAsync)
      .mock.calls.map(([id]) => id);
    expect(channels).toEqual(['content', 'deadlines', 'classes']);
    expect(
      jest.mocked(Notifications.setNotificationChannelAsync).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(Notifications.requestPermissionsAsync).mock
        .invocationCallOrder[0],
    );
  });
});

describe('postNotification', () => {
  const content = {
    title: 'Course',
    body: 'Title',
    target: { type: 'notice' as const, id: 'n1' },
  };

  it('posts now with the target as data', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await postNotification(content);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Course',
        body: 'Title',
        data: { type: 'notice', id: 'n1' },
        categoryIdentifier: 'contentItem',
      },
      trigger: null,
    });
  });

  it('uses a channel on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await postNotification(content, 'deadlines');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: { channelId: 'deadlines' } }),
    );
  });

  it('marks a grouped notification for Archive All', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await postNotification({
      title: 'Course',
      body: '3 new files',
      target: { type: 'file' },
      ids: ['f1', 'f2', 'f3'],
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Course',
        body: '3 new files',
        data: { type: 'file', ids: ['f1', 'f2', 'f3'] },
        categoryIdentifier: 'contentItems',
      },
      trigger: null,
    });
  });

  it('shows no buttons for a list without items', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await postNotification({
      title: 'Course',
      body: 'Changed',
      target: { type: 'file' },
    });
    expect(
      jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0]
        .content.categoryIdentifier,
    ).toBeUndefined();
  });
});

describe('getNotificationData', () => {
  it('reads ids and the deadline, dropping malformed fields', () => {
    expect(
      getNotificationData(
        response({ type: 'assignment', id: 'a1', ids: ['a1'], deadline: 5 }),
      ),
    ).toEqual({ type: 'assignment', id: 'a1', ids: ['a1'], deadline: 5 });
    expect(
      getNotificationData(
        response({ type: 'file', id: 3, ids: ['f1', 2], deadline: '5' }),
      ),
    ).toEqual({
      type: 'file',
      id: undefined,
      ids: undefined,
      deadline: undefined,
    });
  });

  it('parses the JSON string a response to the Android task carries', () => {
    const fromTask = (dataString: string) =>
      ({
        actionIdentifier: 'archive',
        notification: { request: { content: { dataString } } },
      }) as unknown as Notifications.NotificationResponse;
    expect(
      getNotificationData(fromTask('{"type":"notice","id":"n1"}')),
    ).toEqual({
      type: 'notice',
      id: 'n1',
      ids: undefined,
      deadline: undefined,
    });
    expect(getNotificationData(fromTask('not json'))).toBeNull();
    expect(getNotificationData(fromTask('null'))).toBeNull();
    expect(getNotificationData(fromTask('"notice"'))).toBeNull();
  });

  it('copes with a response without a notification', () => {
    expect(
      getNotificationData({} as Notifications.NotificationResponse),
    ).toBeNull();
  });
});

describe('exact alarms', () => {
  it('are always allowed outside Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await expect(canScheduleExactAlarms()).resolves.toBe(true);
    await expect(requestExactAlarms()).resolves.toBe(true);
    expect(Notifications.getExactAlarmPermissionsAsync).not.toHaveBeenCalled();
    expect(
      Notifications.requestExactAlarmPermissionsAsync,
    ).not.toHaveBeenCalled();
  });

  it('follow the Android permission, false when it cannot be read', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await expect(canScheduleExactAlarms()).resolves.toBe(true);
    jest
      .mocked(Notifications.getExactAlarmPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never)
      .mockRejectedValueOnce(new Error('old Android'));
    await expect(canScheduleExactAlarms()).resolves.toBe(false);
    await expect(canScheduleExactAlarms()).resolves.toBe(false);

    jest
      .mocked(Notifications.requestExactAlarmPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    await expect(requestExactAlarms()).resolves.toBe(false);
  });
});

describe('configureNotifications', () => {
  const setCategory = jest.mocked(Notifications.setNotificationCategoryAsync);

  it('shows notifications in the foreground and sets up the buttons', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await configureNotifications();
    const handler = jest.mocked(Notifications.setNotificationHandler).mock
      .calls[0][0];
    await expect(handler?.handleNotification({} as never)).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(
      setCategory.mock.calls.map(([id, actions]) => [
        id,
        actions.map(a => a.identifier),
      ]),
    ).toEqual([
      ['contentItem', ['favorite', 'archive']],
      ['contentItems', ['archive']],
      ['deadlineReminder', ['remindLater', 'archive']],
    ]);
    // Handled without opening the app
    for (const [, actions] of setCategory.mock.calls) {
      for (const action of actions) {
        expect(action.options?.opensAppToForeground).toBe(false);
      }
    }
  });

  it('creates the channels on Android, even if the buttons fail', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    setCategory.mockRejectedValueOnce(new Error('failed'));
    await expect(configureNotifications()).resolves.toBeUndefined();
    expect(
      jest
        .mocked(Notifications.setNotificationChannelAsync)
        .mock.calls.map(([id]) => id),
    ).toEqual(['content', 'deadlines', 'classes']);
  });
});
