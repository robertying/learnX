import * as Notifications from 'expo-notifications';
import { mockAssignments } from 'data/mock';
import { Assignment } from 'data/types/state';
import {
  cancelDeadlineReminders,
  planDeadlineReminders,
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
  jest.clearAllMocks();
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({ granted: true, canAskAgain: true } as never);
  scheduled.mockResolvedValue([]);
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
