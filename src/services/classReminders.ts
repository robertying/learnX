// Class reminders: a local notification some minutes before each class of
// the cached timetable (this and next week), scheduled ahead like deadline
// reminders, so they go off without the app. They are planned again whenever
// the timetable or the settings change (`services/surfaces`).
import dayjs from 'dayjs';
import { NotificationSettings } from 'data/types/state';
import { t } from 'helpers/i18n';
import {
  canScheduleExactAlarms,
  getNotificationPermission,
  notificationChannels,
} from 'services/notifications';
import {
  cancelScheduled,
  dateTrigger,
  reconcileScheduled,
} from 'services/scheduledNotifications';
import { UpcomingClass } from 'helpers/upNext';

/**
 * iOS keeps at most 64 pending notifications per app, shared with deadline
 * reminders (`DEADLINE_REMINDERS_WITH_CLASSES`).
 */
export const MAX_CLASS_REMINDERS = 24;

/** Identifiers of class reminders start with this, so others are left alone. */
export const CLASS_REMINDER_PREFIX = 'class-reminder:';
const PREFIX = CLASS_REMINDER_PREFIX;

export interface PlannedClassReminder {
  /**
   * Changes with the class, its time and place, the offset and whether it
   * can be exact, so any of them reschedules it.
   */
  identifier: string;
  date: number;
  upcoming: UpcomingClass;
}

/**
 * The reminders to have scheduled: one per class `offset` minutes before it
 * starts, the earliest first, at most `MAX_CLASS_REMINDERS`. Reminders whose
 * time has passed are left out.
 */
export const planClassReminders = (
  classes: UpcomingClass[],
  {
    settings,
    now = Date.now(),
    inexact = false,
  }: {
    settings: Pick<
      NotificationSettings,
      'classReminders' | 'classReminderOffset'
    >;
    now?: number;
    /** Android without the exact alarm permission; see deadline reminders. */
    inexact?: boolean;
  },
): PlannedClassReminder[] => {
  if (!settings.classReminders) {
    return [];
  }
  const offset = settings.classReminderOffset * 60 * 1000;
  return classes
    .filter(c => c.start - offset > now)
    .sort((a, b) => a.start - b.start || a.key.localeCompare(b.key))
    .slice(0, MAX_CLASS_REMINDERS)
    .map(c => ({
      identifier: `${PREFIX}${encodeURIComponent(
        `${c.courseId ?? c.courseName}:${c.location}`,
      )}:${c.start}:${settings.classReminderOffset}${inexact ? ':inexact' : ''}`,
      date: c.start - offset,
      upcoming: c,
    }));
};

/**
 * A reminder's text: the course, then when it starts and where, as Calendar
 * shows an event. Tapping it opens Today.
 */
export const classReminderContent = ({
  courseName,
  location,
  start,
}: UpcomingClass) => ({
  title: courseName,
  body: [t('classStartsAt', { time: dayjs(start).format('HH:mm') }), location]
    .filter(Boolean)
    .join(' · '),
  data: { type: 'today' },
  // Stacked together in the iOS notification center.
  threadIdentifier: notificationChannels.classes,
});

/**
 * Makes the scheduled class reminders match the plan: cancels the ones no
 * longer wanted (class moved, turned off) and schedules the new ones.
 * Without the permission, cancels them all.
 */
export const syncClassReminders = async (
  classes: UpcomingClass[],
  options: Omit<Parameters<typeof planClassReminders>[1], 'inexact'>,
) => {
  const granted = (await getNotificationPermission()) === 'granted';
  const plan =
    granted && options.settings.classReminders
      ? planClassReminders(classes, {
          ...options,
          inexact: !(await canScheduleExactAlarms()),
        })
      : [];
  await reconcileScheduled(
    id => id.startsWith(PREFIX),
    plan.map(r => ({
      identifier: r.identifier,
      content: classReminderContent(r.upcoming),
      trigger: dateTrigger(r.date, notificationChannels.classes),
    })),
  );
};

/** Cancels every class reminder, e.g. when logging out. */
export const cancelClassReminders = () =>
  cancelScheduled(id => id.startsWith(PREFIX));
