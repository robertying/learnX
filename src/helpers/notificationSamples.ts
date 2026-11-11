// Debug builds: every kind of notification learnX posts, made from the
// cached items through the same code a sync uses, for reviewing their text.
import dayjs from 'dayjs';
import { HomeworkCompletionType } from '@robertying/thu-learn-lib';
import { ContentDiff } from 'data/contentDiff';
import { Assignment, File, Notice } from 'data/types/state';
import {
  ContentNotification,
  groupContentItems,
  pickContentItems,
} from 'helpers/contentNotifications';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { classReminderContent } from 'helpers/classReminders';
import { reminderContent, ReminderKind } from 'helpers/deadlineReminders';
import { t } from 'helpers/i18n';
import { notificationChannels, postNotification } from 'helpers/notifications';

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
  const assignments = (kind: string) =>
    take(lists.assignments, kind).map(a => ({
      ...a,
      id: `${kind}-${a.id}`,
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

/** The notification a sync posts for `notice` alone, as if it were new. */
export const sampleNoticeNotification = (notice: Notice, now = dayjs()) =>
  sampleContentNotifications(
    {
      notices: {
        added: [{ ...notice, hasRead: false, publishTime: now.toISOString() }],
      },
      files: { added: [] },
      assignments: {
        added: [],
        graded: [],
        commented: [],
        deadlineChanged: [],
        groupSubmitted: [],
      },
    },
    now,
  )[0];

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
      trigger:
        Platform.OS === 'android'
          ? { channelId: notificationChannels.deadlines }
          : null,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: sampleClassReminder(assignment),
    trigger:
      Platform.OS === 'android'
        ? { channelId: notificationChannels.classes }
        : null,
  });
  return notifications.length + reminderKinds.length + 1;
};
