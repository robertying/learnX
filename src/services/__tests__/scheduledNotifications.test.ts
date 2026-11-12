import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  dateTrigger,
  immediateTrigger,
  intervalTrigger,
  reconcileScheduled,
} from 'services/scheduledNotifications';

it('puts each trigger on its channel on Android only', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  expect(dateTrigger(1, 'deadlines')).toEqual({ type: 'date', date: 1 });
  expect(intervalTrigger(10, 'classes')).toEqual({
    type: 'timeInterval',
    seconds: 10,
  });
  expect(immediateTrigger('content')).toBeNull();

  jest.replaceProperty(Platform, 'OS', 'android');
  expect(dateTrigger(1, 'deadlines')).toEqual({
    type: 'date',
    date: 1,
    channelId: 'deadlines',
  });
  expect(intervalTrigger(10, 'classes')).toEqual({
    type: 'timeInterval',
    seconds: 10,
    channelId: 'classes',
  });
  expect(immediateTrigger('content')).toEqual({ channelId: 'content' });
});

describe('reconcileScheduled', () => {
  const planned = (identifier: string) => ({
    identifier,
    content: { title: identifier, interruptionLevel: 'timeSensitive' as const },
    trigger: dateTrigger(1, 'deadlines'),
  });
  const scheduled = (identifier: string, interruptionLevel?: string) => ({
    identifier,
    content: { title: identifier, interruptionLevel },
    trigger: {},
  });

  beforeEach(() => {
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockClear();
  });

  it('cancels what left the plan and schedules what joined it', async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        scheduled('r:kept', 'timeSensitive'),
        scheduled('r:gone', 'timeSensitive'),
        scheduled('other', 'active'),
      ] as never);
    await reconcileScheduled(
      id => id.startsWith('r:'),
      [planned('r:kept'), planned('r:new')],
    );
    expect(
      jest.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls,
    ).toEqual([['r:gone']]);
    expect(
      jest
        .mocked(Notifications.scheduleNotificationAsync)
        .mock.calls.map(([n]) => n.identifier),
    ).toEqual(['r:new']);
  });

  it('schedules again what says something else or interrupts differently', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([scheduled('r:old', 'active')] as never);
    await reconcileScheduled(id => id.startsWith('r:'), [planned('r:old')]);
    expect(
      Notifications.cancelScheduledNotificationAsync,
    ).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      planned('r:old'),
    );

    // In another language now.
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        {
          identifier: 'r:old',
          content: { title: '旧', interruptionLevel: 'timeSensitive' },
          trigger: {},
        },
      ] as never);
    await reconcileScheduled(id => id.startsWith('r:'), [planned('r:old')]);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      planned('r:old'),
    );

    // Android has no interruption levels.
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([scheduled('r:old')] as never);
    await reconcileScheduled(id => id.startsWith('r:'), [planned('r:old')]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
