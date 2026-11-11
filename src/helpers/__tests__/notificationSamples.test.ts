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
  // Five kinds, twice each, then the summary a sync of all ten would end with.
  expect(notifications).toHaveLength(11);
  expect(notifications[0]).toEqual(
    expect.objectContaining({
      title: 'Course 1 · New Notices',
      body: 'Notice 1',
      target: { type: 'notice', id: 'n1' },
    }),
  );
  expect(notifications[1]).toEqual(
    expect.objectContaining({
      body: 'Notice 1\nNotice 2',
      target: { type: 'notice' },
      ids: ['n1', 'n2'],
    }),
  );
  expect(notifications.at(-1)).toEqual(
    expect.objectContaining({ title: 'learnX' }),
  );
});

it('makes a deadline reminder an hour ahead', () => {
  const reminder = sampleReminder(
    { id: 'a1', title: 'Essay', courseName: 'Writing' } as never,
    now,
  );
  expect(reminder.title).toBe('Essay');
  expect(reminder.body).toMatch(/^Writing · /);
});

it('posts them all', async () => {
  await expect(postNotificationSamples(lists)).resolves.toBe(12);
  expect(postNotification).toHaveBeenCalledTimes(11);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      content: expect.objectContaining({ title: 'Assignment 1' }),
    }),
  );
});
