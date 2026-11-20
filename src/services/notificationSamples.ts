// Debug builds: the content notifications and reminders learnX posts, made
// from the cached items through the same code a sync uses, for reviewing
// their text.
// E2E builds: the one notification a flow asks for at launch, to press its
// action buttons (`postNotification` in services/launchOptions).
import dayjs from 'dayjs';
import { HomeworkCompletionType } from '@robertying/thu-learn-lib';
import { ContentDiff } from 'data/contentDiff';
import { getAssignment, getFile, getNotice } from 'data/content';
import { queryClient } from 'data/queryClient';
import { Assignment, File, Notice } from 'data/types/state';
import {
  ContentNotification,
  groupContentItems,
  pickContentItems,
} from 'helpers/contentNotifications';
import * as Notifications from 'expo-notifications';
import {
  CLASS_REMINDER_PREFIX,
  classReminderContent,
} from 'services/classReminders';
import {
  DEADLINE_REMINDER_PREFIX,
  reminderContent,
  ReminderKind,
} from 'services/deadlineReminders';
import { t } from 'helpers/i18n';
import { isItemType } from 'helpers/openTarget';
import { notificationChannels, postNotification } from 'services/notifications';
import {
  getScheduled,
  immediateTrigger,
  intervalTrigger,
} from 'services/scheduledNotifications';

/** How many items of each kind: one opens itself, two make a list. */
const counts = [1, 2];

/**
 * A sync result with every kind of change, once for a single item and once
 * for two, each in a course of its own so they stay separate notifications.
 */
export const sampleDiff = (
  lists: {
    notices: readonly Notice[];
    assignments: readonly Assignment[];
    files: readonly File[];
  },
  now = dayjs(),
): ContentDiff => {
  const recent = now.subtract(1, 'hour').toISOString();
  const due = now.add(3, 'day').toISOString();
  const later = now.add(5, 'day').toISOString();
  /** `count` items, each group in its own course. */
  const take = <T extends { courseId: string; courseName: string }>(
    items: readonly T[],
    kind: string,
  ) =>
    counts.flatMap((count, group) =>
      items.slice(0, count).map(item => ({
        ...item,
        courseId: `${kind}-${group}`,
      })),
    );
  // The items keep their ids, so a tap opens them as a real one would.
  const assignments = (kind: string) =>
    take(lists.assignments, kind).map(a => ({
      ...a,
      submitted: false,
      deadline: due,
    }));
  return {
    notices: {
      added: take(lists.notices, 'notice').map(n => ({
        ...n,
        hasRead: false,
        publishTime: recent,
      })),
    },
    files: {
      added: take(lists.files, 'file').map(f => ({ ...f, uploadTime: recent })),
    },
    assignments: {
      added: assignments('new'),
      graded: assignments('graded').map(a => ({
        before: a,
        after: {
          ...a,
          graded: true,
          grade: 95,
          gradeLevel: undefined,
          gradeContent: t('sampleGradeComment'),
        },
      })),
      commented: assignments('comment').map(a => {
        const before = { ...a, graded: true, grade: 95, gradeLevel: undefined };
        return {
          before,
          after: { ...before, gradeContent: t('sampleGradeComment') },
        };
      }),
      deadlineChanged: assignments('deadline').map(a => ({
        before: a,
        after: { ...a, deadline: later },
      })),
      groupSubmitted: assignments('group').map(a => ({
        before: { ...a, completionType: HomeworkCompletionType.GROUP },
        after: {
          ...a,
          completionType: HomeworkCompletionType.GROUP,
          submitted: true,
        },
      })),
    },
  };
};

/**
 * The content notifications for `sampleDiff`: each kind's, then the summary
 * a sync posts in place of the ones past its limit.
 */
export const sampleContentNotifications = (
  diff: ContentDiff,
  now = dayjs(),
): ContentNotification[] => {
  const items = pickContentItems(diff, {
    settings: {
      notices: true,
      files: true,
      assignments: true,
      grades: true,
      deadlineChanges: true,
      groupSubmissions: true,
      deadlineReminders: true,
      deadlineReminderOffset: 60,
      classReminders: true,
      appUpdates: true,
      classReminderOffset: 15,
    },
    notified: new Set(),
    hiddenCourses: [],
    archived: { notice: [], assignment: [], file: [] },
    now,
  });
  const kinds = [...new Set(items.map(item => item.kind))];
  // The summary is the one notification about several courses.
  const summary = groupContentItems(items).find(n => !n.threadId);
  return [
    ...kinds.flatMap(kind =>
      groupContentItems(items.filter(item => item.kind === kind)),
    ),
    ...(summary ? [summary] : []),
  ];
};

/**
 * The notifications a sync posts when `items` of one type are new, as if
 * they were all in the first one's course: one names its item, several are
 * counted in one notification.
 */
export const sampleNewContentNotifications = (
  items:
    | { type: 'notice'; items: readonly Notice[] }
    | { type: 'assignment'; items: readonly Assignment[] }
    | { type: 'file'; items: readonly File[] },
  now = dayjs(),
) => {
  const time = now.toISOString();
  const course = (item: Notice | Assignment | File) => ({
    courseId: items.items[0].courseId,
    courseName: items.items[0].courseName,
    id: item.id,
  });
  return sampleContentNotifications(
    {
      notices: {
        added:
          items.type === 'notice'
            ? items.items.map(n => ({
                ...n,
                ...course(n),
                hasRead: false,
                publishTime: time,
              }))
            : [],
      },
      files: {
        added:
          items.type === 'file'
            ? items.items.map(f => ({ ...f, ...course(f), uploadTime: time }))
            : [],
      },
      assignments: {
        added:
          items.type === 'assignment'
            ? items.items.map(a => ({
                ...a,
                ...course(a),
                submitted: false,
                deadline: now.add(3, 'day').toISOString(),
              }))
            : [],
        graded: [],
        commented: [],
        deadlineChanged: [],
        groupSubmitted: [],
      },
    },
    now,
  );
};

/** The notification a sync posts for `notice` alone, as if it were new. */
export const sampleNoticeNotification = (notice: Notice, now = dayjs()) =>
  sampleNewContentNotifications({ type: 'notice', items: [notice] }, now)[0];

/**
 * A deadline reminder for `assignment`, as it shows an hour before the
 * deadline, or for the late kinds, as it shows at the deadline (late
 * submission open for two more days) and an hour before late submission
 * closes.
 */
export const sampleReminder = (
  assignment: Assignment,
  now = dayjs(),
  kind: ReminderKind = 'due',
) => {
  const deadline = kind === 'lateOpen' ? now.add(2, 'day') : now.add(1, 'hour');
  return reminderContent(
    {
      id: assignment.id,
      title: assignment.title,
      courseName: assignment.courseName,
      deadline: deadline.valueOf(),
    },
    now.valueOf(),
    kind,
  );
};

const reminderKinds: ReminderKind[] = ['due', 'lateOpen', 'lateDue'];

/** A class reminder for `assignment`'s course, as it shows 15 minutes ahead. */
export const sampleClassReminder = (
  assignment: Pick<Assignment, 'courseId' | 'courseName'>,
  now = dayjs(),
) =>
  classReminderContent({
    key: 'sample',
    courseName: assignment.courseName,
    courseId: assignment.courseId,
    location: 'A301',
    start: now.add(15, 'minute').valueOf(),
    end: now.add(110, 'minute').valueOf(),
  });

/**
 * Posts every sample: the content notifications, then a deadline reminder of
 * each kind and a class reminder. Resolves to how many were posted.
 */
export const postNotificationSamples = async (
  lists: Parameters<typeof sampleDiff>[0],
) => {
  const notifications = sampleContentNotifications(sampleDiff(lists));
  for (const notification of notifications) {
    await postNotification(notification);
  }
  const assignment = lists.assignments[0];
  if (!assignment) {
    return notifications.length;
  }
  for (const kind of reminderKinds) {
    await Notifications.scheduleNotificationAsync({
      content: sampleReminder(assignment, dayjs(), kind),
      trigger: immediateTrigger(notificationChannels.deadlines),
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: sampleClassReminder(assignment),
    trigger: immediateTrigger(notificationChannels.classes),
  });
  return notifications.length + reminderKinds.length + 1;
};

/**
 * How many deadline or class reminders are scheduled, and the first one
 * again in ten seconds, to see what it looks like.
 */
export const previewScheduledReminder = async (kind: 'deadline' | 'class') => {
  const [prefix, channel] =
    kind === 'deadline'
      ? [DEADLINE_REMINDER_PREFIX, notificationChannels.deadlines]
      : [CLASS_REMINDER_PREFIX, notificationChannels.classes];
  const scheduled = await getScheduled(id => id.startsWith(prefix));
  const first = scheduled[0];
  if (first) {
    const { title, subtitle, body, data, categoryIdentifier } = first.content;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        subtitle,
        body,
        data,
        categoryIdentifier: categoryIdentifier ?? undefined,
        threadIdentifier: channel,
      },
      trigger: intervalTrigger(10, channel),
    });
  }
  return scheduled.length;
};

/**
 * Resolves to what `find` returns once the cached lists have it (they load
 * after the login), or to undefined after `timeout` ms.
 */
const whenCached = <T>(find: () => T | undefined, timeout = 60_000) =>
  new Promise<T | undefined>(resolve => {
    const found = find();
    if (found !== undefined) {
      resolve(found);
      return;
    }
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      const value = find();
      if (value !== undefined) {
        clearTimeout(timer);
        unsubscribe();
        resolve(value);
      }
    });
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(undefined);
    }, timeout);
  });

/** Every item of `ids`, once all are cached. */
const cachedItems = <T>(ids: string[], get: (id: string) => T | undefined) =>
  whenCached(() => {
    const items = ids.map(get);
    return items.every(item => item !== undefined) ? (items as T[]) : undefined;
  });

/**
 * Posts the notification `spec` describes (`postNotification` in
 * services/launchOptions) once its items are cached: `<type>:<id>[,<id>…]` new
 * content of that type, `reminder:<assignment id>` a deadline reminder.
 * Resolves to whether it posted one.
 */
export const postLaunchNotification = async (spec: string) => {
  const [kind, list = ''] = spec.split(':');
  const ids = list.split(',').filter(Boolean);
  if (ids.length === 0) {
    return false;
  }
  if (kind === 'reminder') {
    const [assignment] =
      (await cachedItems(ids.slice(0, 1), getAssignment)) ?? [];
    if (!assignment) {
      return false;
    }
    await Notifications.scheduleNotificationAsync({
      content: sampleReminder(assignment),
      trigger: immediateTrigger(notificationChannels.deadlines),
    });
    return true;
  }
  if (!isItemType(kind)) {
    return false;
  }
  let notifications: ContentNotification[] = [];
  if (kind === 'notice') {
    const items = await cachedItems(ids, getNotice);
    notifications = items
      ? sampleNewContentNotifications({ type: kind, items })
      : [];
  } else if (kind === 'assignment') {
    const items = await cachedItems(ids, getAssignment);
    notifications = items
      ? sampleNewContentNotifications({ type: kind, items })
      : [];
  } else {
    const items = await cachedItems(ids, getFile);
    notifications = items
      ? sampleNewContentNotifications({ type: kind, items })
      : [];
  }
  for (const notification of notifications) {
    await postNotification(notification);
  }
  return notifications.length > 0;
};
