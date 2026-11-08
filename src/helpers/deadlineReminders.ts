import { Platform } from 'react-native';
import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { Assignment, NotificationSettings } from 'data/types/state';
import { t } from 'helpers/i18n';
import {
  getNotificationPermission,
  notificationCategories,
  notificationChannels,
} from 'helpers/notifications';
import { upcomingDeadlines, WidgetDeadline } from 'helpers/widgetDeadlines';

/** iOS keeps at most 64 pending notifications per app; leave some room. */
const MAX_REMINDERS = 48;

/** Identifiers of reminders start with this, so others are left alone. */
const PREFIX = 'deadline-reminder:';

/**
 * A reminder the user put off, one per assignment. It isn't part of the
 * plan, so syncing the reminders leaves it alone.
 */
const LATER_PREFIX = 'deadline-later:';

/** How long Remind Later puts a reminder off. */
const LATER_MINUTES = 60;

/** Remind Later doesn't remind closer to the deadline than this. */
const LATER_MARGIN_MINUTES = 5;

export interface PlannedReminder {
  /** Changes with the deadline and the offset, so either reschedules it. */
  identifier: string;
  date: number;
  deadline: WidgetDeadline;
}

/**
 * The reminders to have scheduled: one per open assignment, `offset`
 * minutes before its deadline, the earliest first. Reminders whose time has
 * passed are left out.
 */
export const planDeadlineReminders = (
  assignments: Assignment[],
  {
    settings,
    hiddenCourses,
    archived,
    now = Date.now(),
  }: {
    settings: Pick<
      NotificationSettings,
      'deadlineReminders' | 'deadlineReminderOffset'
    >;
    hiddenCourses: string[];
    archived: string[];
    now?: number;
  },
): PlannedReminder[] => {
  if (!settings.deadlineReminders) {
    return [];
  }
  const offset = settings.deadlineReminderOffset * 60 * 1000;
  const { deadlines } = upcomingDeadlines(assignments, {
    hiddenCourses,
    archived,
    now: now + offset,
    limit: MAX_REMINDERS,
  });
  return deadlines.map(deadline => ({
    identifier: `${PREFIX}${deadline.id}:${deadline.deadline}:${settings.deadlineReminderOffset}`,
    date: deadline.deadline - offset,
    deadline,
  }));
};

const reminderContent = ({
  id,
  title,
  courseName,
  deadline,
}: WidgetDeadline) => ({
  title,
  body: `${courseName} · ${t('deadlineReminderDue')} ${dayjs(deadline).format(
    t('shortDateTimeFormat'),
  )}`,
  data: { type: 'assignment', id, deadline },
  categoryIdentifier: notificationCategories.deadline,
});

/**
 * Makes the scheduled reminders match the plan: cancels the ones no longer
 * wanted (submitted, archived, deadline moved, turned off) and schedules the
 * new ones. Without the permission, cancels them all.
 */
export const syncDeadlineReminders = async (
  ...args: Parameters<typeof planDeadlineReminders>
) => {
  const plan =
    (await getNotificationPermission()) === 'granted'
      ? planDeadlineReminders(...args)
      : [];
  const wanted = new Set(plan.map(r => r.identifier));
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
    .map(n => n.identifier)
    .filter(id => id.startsWith(PREFIX));
  const existing = new Set(scheduled);

  await Promise.all([
    ...scheduled
      .filter(id => !wanted.has(id))
      .map(id => Notifications.cancelScheduledNotificationAsync(id)),
    ...plan
      .filter(r => !existing.has(r.identifier))
      .map(r =>
        Notifications.scheduleNotificationAsync({
          identifier: r.identifier,
          content: reminderContent(r.deadline),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: r.date,
            ...(Platform.OS === 'android'
              ? { channelId: notificationChannels.deadlines }
              : {}),
          },
        }),
      ),
  ]);
};

const cancelScheduled = async (matches: (identifier: string) => boolean) => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => matches(n.identifier))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
};

/** Cancels every reminder, e.g. when logging out. */
export const cancelDeadlineReminders = () =>
  cancelScheduled(id => id.startsWith(PREFIX) || id.startsWith(LATER_PREFIX));

/**
 * Cancels the reminders of these assignments, e.g. when they are archived
 * from a notification while the app isn't running to do it.
 */
export const cancelDeadlineRemindersOf = (assignmentIds: string[]) => {
  const ids = new Set(assignmentIds);
  return cancelScheduled(identifier => {
    const [prefix, id] = identifier.split(':');
    return (
      (`${prefix}:` === PREFIX || `${prefix}:` === LATER_PREFIX) && ids.has(id)
    );
  });
};

/**
 * When Remind Later on a reminder should remind again: in an hour, but not
 * later than a few minutes before the deadline. Null when that has passed.
 */
export const remindLaterDate = (deadline: number, now = Date.now()) => {
  const date = Math.min(
    now + LATER_MINUTES * 60 * 1000,
    deadline - LATER_MARGIN_MINUTES * 60 * 1000,
  );
  return date > now ? date : null;
};

/** Shows a reminder again later, replacing one put off before. */
export const remindLater = async (
  notification: Notifications.Notification,
  { id, deadline }: { id: string; deadline: number },
) => {
  const date = remindLaterDate(deadline);
  if (date === null) {
    return;
  }
  const { title, body, data } = notification.request.content;
  await Notifications.scheduleNotificationAsync({
    identifier: `${LATER_PREFIX}${id}`,
    content: {
      title,
      body,
      data: { ...data, type: 'assignment', id, deadline },
      categoryIdentifier: notificationCategories.deadline,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android'
        ? { channelId: notificationChannels.deadlines }
        : {}),
    },
  });
};

/**
 * Debug builds: how many reminders are scheduled, and the first one again in
 * ten seconds, to see what it looks like.
 */
export const previewDeadlineReminder = async () => {
  const scheduled = (
    await Notifications.getAllScheduledNotificationsAsync()
  ).filter(n => n.identifier.startsWith(PREFIX));
  const first = scheduled[0];
  if (first) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: first.content.title,
        body: first.content.body,
        data: first.content.data,
        categoryIdentifier: notificationCategories.deadline,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        ...(Platform.OS === 'android'
          ? { channelId: notificationChannels.deadlines }
          : {}),
      },
    });
  }
  return scheduled.length;
};
