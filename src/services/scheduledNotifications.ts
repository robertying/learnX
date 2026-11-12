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

/** iOS's interruption level of a notification, if it says. */
const interruptionLevel = (content: object | undefined) =>
  (content as { interruptionLevel?: string } | undefined)?.interruptionLevel;

/**
 * Makes the scheduled notifications that `owns` accepts match `plan`:
 * cancels the ones not in it (unless `keep` accepts them) and schedules the
 * ones not scheduled yet. An identifier changes with whatever should
 * reschedule a notification, so one already scheduled is left as it is,
 * unless it was scheduled with another interruption level on iOS (by an
 * earlier version of the app).
 */
export const reconcileScheduled = async (
  owns: (identifier: string) => boolean,
  plan: PlannedNotification[],
  keep: (identifier: string) => boolean = () => false,
) => {
  const wanted = new Set(plan.map(n => n.identifier));
  const scheduled = await getScheduled(owns);
  const current = new Map(
    scheduled.map(n => [n.identifier, interruptionLevel(n.content)]),
  );
  // iOS always says the scheduled one's level; a plan without one wants the
  // default.
  const isCurrent = (n: PlannedNotification) => {
    if (!current.has(n.identifier)) {
      return false;
    }
    const level = current.get(n.identifier);
    return (
      Platform.OS !== 'ios' ||
      level === undefined ||
      level === (interruptionLevel(n.content) ?? 'active')
    );
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
