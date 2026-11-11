import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { postNotification } from 'helpers/notifications';
import {
  postNotificationSamples,
  sampleContentNotifications,
  sampleDiff,
  sampleReminder,
} from 'helpers/notificationSamples';

jest.mock('helpers/notifications', () => ({
  ...jest.requireActual('helpers/notifications'),
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
  await expect(postNotificationSamples(lists)).resolves.toBe(18);
  expect(postNotification).toHaveBeenCalledTimes(15);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      content: expect.objectContaining({ title: 'Assignment 1' }),
    }),
  );
});
