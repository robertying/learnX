import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { postNotification } from 'services/notifications';
import { immediateTrigger } from 'services/scheduledNotifications';
import { queryClient } from 'data/queryClient';
import { queryKeys } from 'data/queryKeys';
import {
  postLaunchNotification,
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
      title: 'New Notice',
      subtitle: 'Course 1',
      body: 'Notice 1',
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
    'Assignment 1\nGrade: 95 · Well done. Part 2 misses the empty-tree case.',
  );
  expect(single('comments')).toBe(
    'Assignment 1\nWell done. Part 2 misses the empty-tree case.',
  );
  expect(single('groupSubmissions')).toBe('Assignment 1');
});

it('points every sample at an item that exists, so tapping it opens it', () => {
  const ids = new Set(
    Object.values(lists as Record<string, { id: string }[]>).flatMap(items =>
      items.map(item => item.id),
    ),
  );
  for (const n of sampleContentNotifications(sampleDiff(lists, now), now)) {
    for (const id of [n.target.id, ...(n.ids ?? [])].filter(Boolean)) {
      expect(ids).toContain(id);
    }
  }
});

it('makes a deadline reminder an hour ahead', () => {
  const reminder = sampleReminder(
    { id: 'a1', title: 'Essay', courseName: 'Writing' } as never,
    now,
  );
  expect(reminder).toMatchObject({
    title: 'Deadline Reminder',
    subtitle: 'Writing',
    body: 'Essay\nDue today at 13:00',
  });
});

it('makes the late submission reminders', () => {
  const assignment = { id: 'a1', title: 'Essay', courseName: 'Writing' };
  expect(sampleReminder(assignment as never, now, 'lateOpen')).toMatchObject({
    title: 'Deadline Passed',
    body: 'Essay\nLate submission until Nov 13 12:00',
  });
  expect(sampleReminder(assignment as never, now, 'lateDue')).toMatchObject({
    title: 'Late Submission Reminder',
    body: 'Essay\nLate submission closes today at 13:00',
  });
});

it('posts them all', async () => {
  await expect(postNotificationSamples(lists)).resolves.toBe(19);
  expect(postNotification).toHaveBeenCalledTimes(15);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      content: expect.objectContaining({
        body: expect.stringMatching(/^Assignment 1\n/),
      }),
    }),
  );
});

it('posts no reminders without an assignment to name', async () => {
  const posted = await postNotificationSamples({
    ...(lists as object),
    assignments: [],
  } as never);
  expect(posted).toBe(jest.mocked(postNotification).mock.calls.length);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
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

describe('postLaunchNotification', () => {
  const put = () => {
    const { notices, assignments } = lists as unknown as Record<
      string,
      unknown[]
    >;
    queryClient.setQueryData(queryKeys.content('notices', 's'), notices);
    queryClient.setQueryData(
      queryKeys.content('assignments', 's'),
      assignments,
    );
  };

  afterEach(() => {
    queryClient.clear();
  });

  it('posts a new item with its own buttons', async () => {
    put();
    await expect(postLaunchNotification('notice:n2')).resolves.toBe(true);
    expect(postNotification).toHaveBeenCalledTimes(1);
    expect(postNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Notice',
        body: 'Notice 2',
        target: { type: 'notice', id: 'n2' },
      }),
    );
  });

  it("posts several items as one, in the first one's course", async () => {
    put();
    await expect(postLaunchNotification('notice:n1,n2')).resolves.toBe(true);
    expect(postNotification).toHaveBeenCalledTimes(1);
    expect(postNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        subtitle: 'Course 1',
        target: { type: 'notice' },
        ids: ['n1', 'n2'],
      }),
    );
  });

  it('posts a deadline reminder', async () => {
    put();
    await expect(postLaunchNotification('reminder:a1')).resolves.toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        title: 'Deadline Reminder',
        data: expect.objectContaining({
          type: 'assignment',
          id: 'a1',
          title: 'Assignment 1',
        }),
      }),
      trigger: immediateTrigger('deadlines'),
    });
  });

  it('waits for the lists to load', async () => {
    const posted = postLaunchNotification('assignment:a1');
    expect(postNotification).not.toHaveBeenCalled();
    put();
    await expect(posted).resolves.toBe(true);
    expect(postNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Assignment',
        body: expect.stringMatching(/^Assignment 1\n/),
        target: { type: 'assignment', id: 'a1' },
      }),
    );
  });

  it('gives up on items that never load', async () => {
    jest.useFakeTimers();
    put();
    const posted = postLaunchNotification('file:f1');
    await jest.advanceTimersByTimeAsync(60_000);
    await expect(posted).resolves.toBe(false);
    expect(postNotification).not.toHaveBeenCalled();
  });

  it('posts a new file', async () => {
    const { files } = lists as unknown as Record<string, { id: string }[]>;
    queryClient.setQueryData(queryKeys.content('files', 's'), files);
    await expect(postLaunchNotification(`file:${files[0].id}`)).resolves.toBe(
      true,
    );
    expect(postNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { type: 'file', id: files[0].id },
      }),
    );
  });

  it.each(['reminder:a9', 'notice:n9', 'assignment:a9'])(
    'gives up on %s, which never loads',
    async spec => {
      jest.useFakeTimers();
      put();
      const posted = postLaunchNotification(spec);
      await jest.advanceTimersByTimeAsync(60_000);
      await expect(posted).resolves.toBe(false);
      expect(postNotification).not.toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    },
  );

  it("ignores what it doesn't know", async () => {
    await expect(postLaunchNotification('course:c1')).resolves.toBe(false);
    await expect(postLaunchNotification('reminder')).resolves.toBe(false);
    expect(postNotification).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
