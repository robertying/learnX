// What deadline and class reminders share: keeping a set of scheduled local
// notifications in step with a plan, and the triggers they go off by.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** A notification to have scheduled, by an identifier that names it. */
export interface PlannedNotification {
  identifier: string;
  content: Notifications.NotificationContentInput;
  trigger: Notifications.NotificationTriggerInput;
}

/** Goes off at `date` (ms), on `channelId` on Android. */
export const dateTrigger = (
  date: number,
  channelId: string,
): Notifications.DateTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.DATE,
  date,
  ...(Platform.OS === 'android' ? { channelId } : {}),
});

/** Goes off `seconds` from now, on `channelId` on Android. */
export const intervalTrigger = (
  seconds: number,
  channelId: string,
): Notifications.TimeIntervalTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
  seconds,
  ...(Platform.OS === 'android' ? { channelId } : {}),
});

/** Shows right away, on `channelId` on Android. */
export const immediateTrigger = (
  channelId: string,
): Notifications.NotificationTriggerInput =>
  Platform.OS === 'android' ? { channelId } : null;

/** The scheduled notifications whose identifiers `matches` accepts. */
export const getScheduled = async (matches: (identifier: string) => boolean) =>
  (await Notifications.getAllScheduledNotificationsAsync()).filter(n =>
    matches(n.identifier),
  );

/** Cancels the scheduled notifications whose identifiers `matches` accepts. */
export const cancelScheduled = async (
  matches: (identifier: string) => boolean,
) => {
  const scheduled = await getScheduled(matches);
  await Promise.all(
    scheduled.map(n =>
      Notifications.cancelScheduledNotificationAsync(n.identifier),
    ),
  );
};

/** What a reminder says and how it interrupts, as the system reports it. */
const shownFields = ['title', 'subtitle', 'body', 'interruptionLevel'] as const;

/**
 * Whether a scheduled notification still says what the planned one would.
 * Only the fields the system reports are compared (Android has no subtitle or
 * interruption level).
 */
const saysTheSame = (scheduled: object, planned: object) =>
  shownFields.every(field => {
    const before = (scheduled as Record<string, unknown>)[field];
    const after =
      (planned as Record<string, unknown>)[field] ??
      (field === 'interruptionLevel' ? 'active' : undefined);
    return before == null || before === after;
  });

/**
 * Makes the scheduled notifications that `owns` accepts match `plan`:
 * cancels the ones not in it (unless `keep` accepts them) and schedules the
 * ones not scheduled yet. An identifier changes with whatever should
 * reschedule a notification, so one already scheduled is left as it is,
 * unless its text or interruption level differ, e.g. after a change of
 * language or time format, or from an earlier version of the app.
 */
export const reconcileScheduled = async (
  owns: (identifier: string) => boolean,
  plan: PlannedNotification[],
  keep: (identifier: string) => boolean = () => false,
) => {
  const wanted = new Set(plan.map(n => n.identifier));
  const scheduled = await getScheduled(owns);
  const contents = new Map(
    scheduled.map(n => [n.identifier, n.content as object | undefined]),
  );
  const isCurrent = (n: PlannedNotification) => {
    if (!contents.has(n.identifier)) {
      return false;
    }
    const content = contents.get(n.identifier);
    return !content || saysTheSame(content, n.content);
  };
  await Promise.all([
    ...scheduled
      .map(n => n.identifier)
      .filter(id => !wanted.has(id) && !keep(id))
      .map(id => Notifications.cancelScheduledNotificationAsync(id)),
    // Scheduling an identifier again replaces it.
    ...plan
      .filter(n => !isCurrent(n))
      .map(n => Notifications.scheduleNotificationAsync(n)),
  ]);
};
