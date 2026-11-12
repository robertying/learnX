import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { postNotification } from 'services/notifications';
import {
  postNotificationSamples,
  previewScheduledReminder,
  sampleContentNotifications,
  sampleDiff,
  sampleReminder,
} from 'services/notificationSamples';

jest.mock('services/notifications', () => ({
  ...jest.requireActual('services/notifications'),
  postNotification: jest.fn(),
}));

const course = (i: number) => ({
  courseId: `c${i}`,
  courseName: `Course ${i}`,
});
const lists = {
  notices: [1, 2].map(i => ({
    id: `n${i}`,
    title: `Notice ${i}`,
    ...course(i),
  })),
  files: [1, 2].map(i => ({ id: `f${i}`, title: `File ${i}`, ...course(i) })),
  assignments: [1, 2].map(i => ({
    id: `a${i}`,
    title: `Assignment ${i}`,
    ...course(i),
  })),
} as never;

const now = dayjs('2026-11-11T12:00:00');

it('makes a single and a grouped notification of every kind, and the summary', () => {
  const notifications = sampleContentNotifications(sampleDiff(lists, now), now);
  // Seven kinds, twice each, then the summary a sync of all 14 would end with.
  expect(notifications).toHaveLength(15);
  expect(notifications[0]).toEqual(
    expect.objectContaining({
      title: 'Notice 1',
      subtitle: 'Course 1',
      body: 'New notice',
      target: { type: 'notice', id: 'n1' },
    }),
  );
  expect(notifications[1]).toEqual(
    expect.objectContaining({
      title: '2 New Notices',
      body: 'Notice 1\nNotice 2',
      target: { type: 'notice' },
      ids: ['n1', 'n2'],
    }),
  );
  expect(notifications.at(-1)).toEqual(
    expect.objectContaining({ title: '11 Updates in 7 Courses' }),
  );
  const single = (kind: string) =>
    notifications.find(n => n.kind === kind && !n.ids)?.body;
  expect(single('grades')).toBe(
    'Graded: 95 · Well done. Part 2 misses the empty-tree case.',
  );
  expect(single('comments')).toBe(
    'New comment: Well done. Part 2 misses the empty-tree case.',
  );
  expect(single('groupSubmissions')).toBe('Submitted by your group');
});

it('makes a deadline reminder an hour ahead', () => {
  const reminder = sampleReminder(
    { id: 'a1', title: 'Essay', courseName: 'Writing' } as never,
    now,
  );
  expect(reminder).toMatchObject({
    title: 'Essay',
    subtitle: 'Writing',
    body: 'Due today at 13:00',
  });
});

it('makes the late submission reminders', () => {
  const assignment = { id: 'a1', title: 'Essay', courseName: 'Writing' };
  expect(sampleReminder(assignment as never, now, 'lateOpen').body).toBe(
    'Deadline passed · late submission until Nov 13 12:00',
  );
  expect(sampleReminder(assignment as never, now, 'lateDue').body).toBe(
    'Late submission closes today at 13:00',
  );
});

it('posts them all', async () => {
  await expect(postNotificationSamples(lists)).resolves.toBe(19);
  expect(postNotification).toHaveBeenCalledTimes(15);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      content: expect.objectContaining({ title: 'Assignment 1' }),
    }),
  );
});

describe('previewScheduledReminder', () => {
  const scheduled = jest.mocked(
    Notifications.getAllScheduledNotificationsAsync,
  );
  const schedule = jest.mocked(Notifications.scheduleNotificationAsync);

  it('shows the first reminder of the kind again soon and counts them', async () => {
    scheduled.mockResolvedValue([
      { identifier: 'class-reminder:a:1:15', content: { title: 'Class' } },
      {
        identifier: 'deadline-reminder:a:1:60',
        content: {
          title: 'A',
          subtitle: 'Course',
          body: 'Due',
          data: { id: 'a' },
          categoryIdentifier: 'deadlineReminder',
        },
      },
      { identifier: 'deadline-reminder:b:1:60', content: { title: 'B' } },
    ] as never);
    await expect(previewScheduledReminder('deadline')).resolves.toBe(2);
    expect(schedule).toHaveBeenCalledWith({
      content: {
        title: 'A',
        subtitle: 'Course',
        body: 'Due',
        data: { id: 'a' },
        categoryIdentifier: 'deadlineReminder',
        threadIdentifier: 'deadlines',
      },
      trigger: { type: 'timeInterval', seconds: 10 },
    });

    await expect(previewScheduledReminder('class')).resolves.toBe(1);
    expect(schedule.mock.calls[1][0]).toMatchObject({
      content: {
        title: 'Class',
        categoryIdentifier: undefined,
        threadIdentifier: 'classes',
      },
    });
  });

  it('schedules nothing without reminders of the kind', async () => {
    scheduled.mockResolvedValue([]);
    await expect(previewScheduledReminder('class')).resolves.toBe(0);
    expect(schedule).not.toHaveBeenCalled();
  });
});
