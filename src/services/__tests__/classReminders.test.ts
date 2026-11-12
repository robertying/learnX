import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  cancelClassReminders,
  classReminderContent,
  MAX_CLASS_REMINDERS,
  planClassReminders,
  syncClassReminders,
} from 'services/classReminders';
import { UpcomingClass } from 'helpers/upNext';

const now = Date.parse('2026-11-09T00:00:00Z');
const minute = 60 * 1000;

const upcoming = (
  key: string,
  startsIn: number,
  overrides: Partial<UpcomingClass> = {},
): UpcomingClass => ({
  key,
  courseName: `Course ${key}`,
  courseId: key,
  location: 'Room 101',
  start: now + startsIn * minute,
  end: now + (startsIn + 95) * minute,
  ...overrides,
});

const on = { classReminders: true, classReminderOffset: 15 };

const scheduled = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);

beforeEach(() => {
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({ granted: true, canAskAgain: true } as never);
  scheduled.mockResolvedValue([]);
});

describe('planClassReminders', () => {
  it('reminds the offset before each class, earliest first', () => {
    const plan = planClassReminders(
      [
        upcoming('later', 600),
        upcoming('soon', 60),
        upcoming('tooSoon', 10),
        upcoming('now', -30),
      ],
      { settings: on, now },
    );
    expect(plan.map(r => r.upcoming.key)).toEqual(['soon', 'later']);
    expect(plan[0].date).toBe(now + 45 * minute);
    expect(plan[0].identifier).toBe(
      `class-reminder:soon%3ARoom%20101:${now + 60 * minute}:15`,
    );
  });

  it('plans nothing when turned off', () => {
    expect(
      planClassReminders([upcoming('a', 60)], {
        settings: { ...on, classReminders: false },
        now,
      }),
    ).toEqual([]);
  });

  it('stays within its share of the iOS limit', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      upcoming(`c${i}`, 60 + i * 100),
    );
    expect(planClassReminders(many, { settings: on, now })).toHaveLength(
      MAX_CLASS_REMINDERS,
    );
  });

  it('names the course when the class has none', () => {
    const [reminder] = planClassReminders(
      [upcoming('a', 60, { courseId: undefined, courseName: 'Physics' })],
      { settings: on, now },
    );
    expect(reminder.identifier).toMatch(/^class-reminder:Physics%3ARoom/);
  });
});

describe('classReminderContent', () => {
  it('says the course, then when and where', () => {
    const start = new Date(2026, 10, 9, 9, 50).valueOf();
    expect(classReminderContent(upcoming('a', 0, { start }))).toEqual({
      title: 'Course a',
      body: 'Starts at 09:50 · Room 101',
      data: { type: 'today' },
      threadIdentifier: 'classes',
    });
    expect(
      classReminderContent(upcoming('a', 0, { start, location: '' })).body,
    ).toBe('Starts at 09:50');
  });
});

describe('syncClassReminders', () => {
  it('schedules new reminders and cancels stale ones, leaving others alone', async () => {
    const keep = `class-reminder:keep%3ARoom%20101:${now + 60 * minute}:15`;
    scheduled.mockResolvedValue([
      { identifier: keep },
      { identifier: 'class-reminder:gone:1:15' },
      { identifier: 'deadline-reminder:a:1:60' },
    ] as never);

    await syncClassReminders([upcoming('keep', 60), upcoming('new', 300)], {
      settings: on,
      now,
    });

    expect(cancel.mock.calls).toEqual([['class-reminder:gone:1:15']]);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0][0]).toMatchObject({
      content: { title: 'Course new', data: { type: 'today' } },
      trigger: { type: 'date', date: now + 285 * minute },
    });
  });

  it('uses the classes channel on Android and marks inexact reminders', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest
      .mocked(Notifications.getExactAlarmPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    await syncClassReminders([upcoming('a', 60)], { settings: on, now });
    expect(schedule.mock.calls[0][0]).toMatchObject({
      identifier: expect.stringMatching(/:inexact$/),
      trigger: { channelId: 'classes' },
    });
  });

  it('cancels everything when turned off or without the permission', async () => {
    scheduled.mockResolvedValue([
      { identifier: 'class-reminder:a:1:15' },
    ] as never);
    await syncClassReminders([upcoming('a', 60)], {
      settings: { ...on, classReminders: false },
      now,
    });
    expect(cancel).toHaveBeenCalledWith('class-reminder:a:1:15');

    cancel.mockClear();
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ granted: false, canAskAgain: false } as never);
    await syncClassReminders([upcoming('a', 60)], { settings: on, now });
    expect(cancel).toHaveBeenCalledWith('class-reminder:a:1:15');
    expect(schedule).not.toHaveBeenCalled();
  });
});

it('cancels only class reminders', async () => {
  scheduled.mockResolvedValue([
    { identifier: 'class-reminder:a:1:15' },
    { identifier: 'deadline-reminder:a:1:60' },
  ] as never);
  await cancelClassReminders();
  expect(cancel.mock.calls).toEqual([['class-reminder:a:1:15']]);
});
