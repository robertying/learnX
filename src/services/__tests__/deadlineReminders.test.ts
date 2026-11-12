import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { mockAssignments } from 'data/mock';
import { Assignment } from 'data/types/state';
import {
  cancelDeadlineReminders,
  cancelDeadlineRemindersOf,
  isReminderKind,
  planDeadlineReminders,
  reminderContent,
  remindLater,
  remindLaterDate,
  syncDeadlineReminders,
} from 'services/deadlineReminders';

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
const options = (settings: typeof on & { classReminders?: boolean } = on) => ({
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

  it('leaves room for class reminders when they are on', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      assignment(`a${i}`, 2 + i),
    );
    expect(
      planDeadlineReminders(many, options({ ...on, classReminders: true })),
    ).toHaveLength(24);
  });

  const late = (dueIn: number, lateIn: number, overrides = {}) =>
    assignment('a', dueIn, {
      lateSubmissionDeadline: new Date(now + lateIn * hour).toISOString(),
      ...overrides,
    });

  it('reminds when late submission opens and before it closes', () => {
    const plan = planDeadlineReminders([late(5, 48)], options());
    expect(plan.map(r => [r.kind, r.date, r.deadline.deadline])).toEqual([
      ['due', now + 4 * hour, now + 5 * hour],
      ['lateOpen', now + 5 * hour, now + 48 * hour],
      ['lateDue', now + 47 * hour, now + 48 * hour],
    ]);
    expect(plan[1].identifier).toBe(
      `deadline-reminder:a:late-open:${now + 5 * hour}:${now + 48 * hour}`,
    );
    expect(plan[2].identifier).toBe(
      `deadline-reminder:a:late:${now + 48 * hour}:60`,
    );
  });

  it('keeps reminding of late submission after the deadline', () => {
    const plan = planDeadlineReminders([late(-5, 48)], options());
    expect(plan.map(r => r.kind)).toEqual(['lateDue']);
  });

  it('leaves the late reminder to the first when it would come sooner', () => {
    const plan = planDeadlineReminders([late(5, 5.5)], options());
    expect(plan.map(r => r.kind)).toEqual(['due', 'lateOpen']);
  });

  it('skips late reminders that are closed, submitted, hidden or archived', () => {
    expect(
      planDeadlineReminders(
        [
          late(-5, -1),
          late(5, 5),
          late(5, 48, { submitted: true }),
          late(5, 48, { courseId: 'hidden' }),
          late(5, 48, { id: 'archived' }),
        ],
        options(),
      ).map(r => r.kind),
    ).toEqual(['due']);
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
        subtitle: expect.any(String),
        body: expect.stringMatching(/^Due (today|tomorrow) at \d\d:\d\d$/),
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

  it('says when late submission closes', async () => {
    await syncDeadlineReminders(
      [
        assignment('a', -1, {
          lateSubmissionDeadline: new Date(now + 3 * hour).toISOString(),
        }),
      ],
      options(),
    );
    expect(schedule.mock.calls[0][0]).toMatchObject({
      content: {
        body: expect.stringMatching(
          /^Late submission closes (today|tomorrow) at \d\d:\d\d$/,
        ),
        data: { type: 'assignment', id: 'a', deadline: now + 3 * hour },
      },
      trigger: { date: now + 2 * hour },
    });
  });

  it('keeps put-off reminders while late submission is open', async () => {
    scheduled.mockResolvedValue([{ identifier: 'deadline-later:a' }] as never);
    await syncDeadlineReminders(
      [
        assignment('a', -1, {
          lateSubmissionDeadline: new Date(now + 3 * hour).toISOString(),
        }),
      ],
      options(),
    );
    expect(cancel).not.toHaveBeenCalled();
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
      content: { title: 'Essay', subtitle: 'Calculus', body: 'Old text' },
    },
  } as unknown as Notifications.Notification;

  beforeEach(() => {
    jest.useFakeTimers({ now });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces the put-off reminder, its text as of when it shows again', async () => {
    Platform.OS = 'ios';
    const deadline = now + 5 * hour;
    await remindLater(notification, { id: 'a', deadline, kind: 'lateDue' });
    expect(schedule).toHaveBeenCalledWith({
      identifier: 'deadline-later:a',
      content: reminderContent(
        { id: 'a', title: 'Essay', courseName: 'Calculus', deadline },
        now + hour,
        'lateDue',
      ),
      trigger: { type: 'date', date: now + hour },
    });
    expect(schedule.mock.calls[0][0].content).toMatchObject({
      subtitle: 'Calculus',
      data: { kind: 'lateDue' },
    });
  });

  it('posts to the deadlines channel on Android', async () => {
    Platform.OS = 'android';
    await remindLater(
      { request: { content: {} } } as unknown as Notifications.Notification,
      { id: 'a', deadline: now + 5 * hour },
    );
    expect(schedule.mock.calls[0][0].trigger).toEqual({
      type: 'date',
      date: now + hour,
      channelId: 'deadlines',
    });
    expect(schedule.mock.calls[0][0].content).toMatchObject({
      title: '',
      subtitle: '',
      data: { kind: 'due' },
    });
  });

  it('does nothing when the deadline is about to pass', async () => {
    await remindLater(notification, { id: 'a', deadline: now + 60 * 1000 });
    expect(schedule).not.toHaveBeenCalled();
  });
});

it('tells reminder kinds apart from other values', () => {
  expect(isReminderKind('lateOpen')).toBe(true);
  expect(isReminderKind('later')).toBe(false);
  expect(isReminderKind(1)).toBe(false);
});
