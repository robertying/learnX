import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { mockAssignments } from 'data/mock';
import { Assignment } from 'data/types/state';
import {
  cancelDeadlineReminders,
  cancelDeadlineRemindersOf,
  planDeadlineReminders,
  previewDeadlineReminder,
  remindLater,
  remindLaterDate,
  syncDeadlineReminders,
} from 'helpers/deadlineReminders';

const now = Date.parse('2026-11-08T02:00:00Z');
const hour = 60 * 60 * 1000;

const assignment = (
  id: string,
  dueIn: number,
  overrides: Partial<Assignment> = {},
): Assignment => ({
  ...mockAssignments[0],
  id,
  title: `Assignment ${id}`,
  courseId: 'c1',
  courseName: 'Calculus',
  submitted: false,
  deadline: new Date(now + dueIn * hour).toISOString(),
  ...overrides,
});

const on = { deadlineReminders: true, deadlineReminderOffset: 60 };
const options = (settings = on) => ({
  settings,
  hiddenCourses: ['hidden'],
  archived: ['archived'],
  now,
});

const scheduled = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);

beforeEach(() => {
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({ granted: true, canAskAgain: true } as never);
  scheduled.mockResolvedValue([]);
});

const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
});

describe('planDeadlineReminders', () => {
  it('reminds of open assignments the offset before, earliest first', () => {
    const plan = planDeadlineReminders(
      [
        assignment('later', 48),
        assignment('soon', 3),
        assignment('done', 5, { submitted: true }),
        assignment('archived', 5),
        assignment('hidden', 5, { courseId: 'hidden' }),
        assignment('tooSoon', 0.5),
        assignment('past', -1),
      ],
      options(),
    );
    expect(plan.map(r => r.deadline.id)).toEqual(['soon', 'later']);
    expect(plan[0].date).toBe(now + 2 * hour);
    expect(plan[0].identifier).toBe(
      `deadline-reminder:soon:${now + 3 * hour}:60`,
    );
  });

  it('plans nothing when turned off', () => {
    expect(
      planDeadlineReminders(
        [assignment('a', 5)],
        options({ ...on, deadlineReminders: false }),
      ),
    ).toEqual([]);
  });

  it('stays under the iOS limit', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      assignment(`a${i}`, 2 + i),
    );
    expect(planDeadlineReminders(many, options())).toHaveLength(48);
  });
});

describe('syncDeadlineReminders', () => {
  it('schedules new reminders and cancels stale ones, leaving others alone', async () => {
    const keep = `deadline-reminder:keep:${now + 5 * hour}:60`;
    scheduled.mockResolvedValue([
      { identifier: keep },
      { identifier: 'deadline-reminder:gone:1:60' },
      { identifier: 'something-else' },
    ] as never);

    await syncDeadlineReminders(
      [assignment('keep', 5), assignment('new', 10)],
      options(),
    );

    expect(cancel.mock.calls).toEqual([['deadline-reminder:gone:1:60']]);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0][0]).toMatchObject({
      identifier: `deadline-reminder:new:${now + 10 * hour}:60`,
      content: {
        title: 'Assignment new',
        data: { type: 'assignment', id: 'new' },
      },
      trigger: { type: 'date', date: now + 9 * hour },
    });
  });

  it('keeps put-off reminders only while their assignment is open', async () => {
    scheduled.mockResolvedValue([
      { identifier: 'deadline-later:open' },
      { identifier: 'deadline-later:submitted' },
      { identifier: 'deadline-later:archived' },
    ] as never);
    await syncDeadlineReminders(
      [
        // Inside the offset: no reminder planned, but still open.
        assignment('open', 0.5),
        assignment('submitted', 5, { submitted: true }),
        assignment('archived', 5),
      ],
      options(),
    );
    expect(cancel.mock.calls.flat().sort()).toEqual([
      'deadline-later:archived',
      'deadline-later:submitted',
    ]);
  });

  it('cancels put-off reminders when reminders are turned off', async () => {
    scheduled.mockResolvedValue([{ identifier: 'deadline-later:a' }] as never);
    await syncDeadlineReminders(
      [assignment('a', 5)],
      options({ ...on, deadlineReminders: false }),
    );
    expect(cancel).toHaveBeenCalledWith('deadline-later:a');
  });

  it('marks reminders that Android may hold back, to redo them once allowed', async () => {
    Platform.OS = 'android';
    jest
      .mocked(Notifications.getExactAlarmPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    await syncDeadlineReminders([assignment('a', 5)], options());
    expect(schedule.mock.calls[0][0].identifier).toBe(
      `deadline-reminder:a:${now + 5 * hour}:60:inexact`,
    );
  });

  it('cancels everything without the permission', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ granted: false, canAskAgain: false } as never);
    scheduled.mockResolvedValue([
      { identifier: 'deadline-reminder:a:1:60' },
    ] as never);
    await syncDeadlineReminders([assignment('a', 5)], options());
    expect(cancel).toHaveBeenCalledWith('deadline-reminder:a:1:60');
    expect(schedule).not.toHaveBeenCalled();
  });
});

it('cancels only reminders', async () => {
  scheduled.mockResolvedValue([
    { identifier: 'deadline-reminder:a:1:60' },
    { identifier: 'other' },
  ] as never);
  await cancelDeadlineReminders();
  expect(cancel.mock.calls).toEqual([['deadline-reminder:a:1:60']]);
});

it('cancels the reminders of given assignments, put off or not', async () => {
  scheduled.mockResolvedValue([
    { identifier: 'deadline-reminder:a:1:60' },
    { identifier: 'deadline-later:a' },
    { identifier: 'deadline-reminder:b:1:60' },
    { identifier: 'a' },
  ] as never);
  await cancelDeadlineRemindersOf(['a']);
  expect(cancel.mock.calls).toEqual([
    ['deadline-reminder:a:1:60'],
    ['deadline-later:a'],
  ]);
});

describe('remindLaterDate', () => {
  const minute = 60 * 1000;

  it('reminds again in an hour when the deadline is far', () => {
    expect(remindLaterDate(now + 5 * hour, now)).toBe(now + hour);
  });

  it('reminds a few minutes before a deadline within the hour', () => {
    expect(remindLaterDate(now + 30 * minute, now)).toBe(now + 25 * minute);
  });

  it('gives up when the deadline is too close or past', () => {
    expect(remindLaterDate(now + 5 * minute, now)).toBeNull();
    expect(remindLaterDate(now + 3 * minute, now)).toBeNull();
    expect(remindLaterDate(now - hour, now)).toBeNull();
  });
});

describe('remindLater', () => {
  const notification = {
    request: {
      content: { title: 'Essay', body: 'Calculus', data: { extra: 1 } },
    },
  } as unknown as Notifications.Notification;

  beforeEach(() => {
    jest.useFakeTimers({ now });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces the put-off reminder of the assignment', async () => {
    Platform.OS = 'ios';
    await remindLater(notification, { id: 'a', deadline: now + 5 * hour });
    expect(schedule).toHaveBeenCalledWith({
      identifier: 'deadline-later:a',
      content: {
        title: 'Essay',
        body: 'Calculus',
        data: {
          extra: 1,
          type: 'assignment',
          id: 'a',
          deadline: now + 5 * hour,
        },
        categoryIdentifier: 'deadlineReminder',
      },
      trigger: { type: 'date', date: now + hour },
    });
  });

  it('posts to the deadlines channel on Android', async () => {
    Platform.OS = 'android';
    await remindLater(notification, { id: 'a', deadline: now + 5 * hour });
    expect(schedule.mock.calls[0][0].trigger).toEqual({
      type: 'date',
      date: now + hour,
      channelId: 'deadlines',
    });
  });

  it('does nothing when the deadline is about to pass', async () => {
    await remindLater(notification, { id: 'a', deadline: now + 60 * 1000 });
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe('previewDeadlineReminder', () => {
  it('shows the first reminder again soon and counts them', async () => {
    scheduled.mockResolvedValue([
      { identifier: 'other', content: { title: 'Other' } },
      {
        identifier: 'deadline-reminder:a:1:60',
        content: { title: 'A', body: 'Due', data: { id: 'a' } },
      },
      { identifier: 'deadline-reminder:b:1:60', content: { title: 'B' } },
    ] as never);
    await expect(previewDeadlineReminder()).resolves.toBe(2);
    expect(schedule).toHaveBeenCalledWith({
      content: {
        title: 'A',
        body: 'Due',
        data: { id: 'a' },
        categoryIdentifier: 'deadlineReminder',
      },
      trigger: { type: 'timeInterval', seconds: 10 },
    });
  });

  it('schedules nothing without reminders', async () => {
    await expect(previewDeadlineReminder()).resolves.toBe(0);
    expect(schedule).not.toHaveBeenCalled();
  });
});
