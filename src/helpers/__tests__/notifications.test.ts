import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getNotificationPermission,
  getNotificationTarget,
  postNotification,
  requestNotificationPermission,
} from 'helpers/notifications';
import { getTargetUrl, getUrlTarget } from 'helpers/openTarget';

const response = (data: unknown) =>
  ({
    actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
    notification: { request: { content: { data } } },
  }) as unknown as Notifications.NotificationResponse;

const setOS = (os: typeof Platform.OS) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

const originalOS = Platform.OS;

afterEach(() => {
  setOS(originalOS);
  jest.clearAllMocks();
});

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

  it("ignores notifications that aren't ours", () => {
    expect(getNotificationTarget(response(null))).toBeNull();
    expect(
      getNotificationTarget(response({ type: 'course', id: 'c' })),
    ).toBeNull();
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
    setOS('android');
    expect(await requestNotificationPermission()).toBe('granted');
    const channels = jest
      .mocked(Notifications.setNotificationChannelAsync)
      .mock.calls.map(([id]) => id);
    expect(channels).toEqual(['content', 'deadlines']);
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
    setOS('ios');
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
    setOS('android');
    await postNotification(content, 'deadlines');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: { channelId: 'deadlines' } }),
    );
  });
});
