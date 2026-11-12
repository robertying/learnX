import { isShownBy } from 'helpers/shown';
import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { Assignment, NotificationSettings } from 'data/types/state';
import { deadlineDayTime } from 'helpers/assignments';
import { t } from 'helpers/i18n';
import {
  canScheduleExactAlarms,
  getNotificationPermission,
  notificationCategories,
  notificationChannels,
} from 'services/notifications';
import {
  cancelScheduled,
  dateTrigger,
  reconcileScheduled,
} from 'services/scheduledNotifications';
import { capitalize } from 'helpers/text';
import { upcomingDeadlines, WidgetDeadline } from 'helpers/widgetDeadlines';

/** iOS keeps at most 64 pending notifications per app; leave some room. */
const MAX_REMINDERS = 48;

/** With class reminders on, they get the rest (`MAX_CLASS_REMINDERS`). */
export const DEADLINE_REMINDERS_WITH_CLASSES = 24;

/** Identifiers of reminders start with this, so others are left alone. */
export const DEADLINE_REMINDER_PREFIX = 'deadline-reminder:';
const PREFIX = DEADLINE_REMINDER_PREFIX;

/**
 * A reminder the user put off, one per assignment. It isn't part of the
 * plan, so syncing the reminders leaves it alone.
 */
const LATER_PREFIX = 'deadline-later:';

/** How long Remind Later puts a reminder off. */
const LATER_MINUTES = 60;

/** Remind Later doesn't remind closer to the deadline than this. */
const LATER_MARGIN_MINUTES = 5;

/**
 * What a reminder is about: the deadline coming up, the deadline passed with
 * late submission still open, or the late submission deadline coming up.
 */
export type ReminderKind = 'due' | 'lateOpen' | 'lateDue';

const reminderKinds: ReadonlySet<unknown> = new Set<ReminderKind>([
  'due',
  'lateOpen',
  'lateDue',
]);

export const isReminderKind = (kind: unknown): kind is ReminderKind =>
  reminderKinds.has(kind);

export interface PlannedReminder {
  /**
   * Changes with the deadline, the offset and whether it can be exact, so
   * any of them reschedules it.
   */
  identifier: string;
  kind: ReminderKind;
  date: number;
  /**
   * The assignment, with the deadline it reminds of: the late submission
   * deadline for the late kinds, which Remind Later reminds before.
   */
  deadline: WidgetDeadline;
}

/**
 * The unsubmitted assignments past their deadline whose late submission is
 * still open at `now`, or will be: those with a late submission deadline
 * after the deadline, without hidden courses and archived assignments.
 */
const lateWindows = (
  assignments: Assignment[],
  {
    hiddenCourses,
    archived,
    now,
  }: { hiddenCourses: string[]; archived: string[]; now: number },
) => {
  const isShown = isShownBy(hiddenCourses, archived);
  return assignments.flatMap(a => {
    if (a.submitted || !a.lateSubmissionDeadline || !isShown(a)) {
      return [];
    }
    const deadline = dayjs(a.deadline).valueOf();
    const late = dayjs(a.lateSubmissionDeadline).valueOf();
    return late > deadline && late > now
      ? [
          {
            deadline,
            late: {
              id: a.id,
              title: a.title,
              courseName: a.courseName,
              deadline: late,
            },
          },
        ]
      : [];
  });
};

/**
 * The reminders to have scheduled, the earliest first, at most
 * `MAX_REMINDERS` (fewer with class reminders on): one per open assignment `offset` minutes before its
 * deadline; and for one that takes late submissions, one when its deadline
 * passes and one `offset` minutes before the late submission deadline (if
 * that's after the deadline). Reminders whose time has passed are left out.
 */
export const planDeadlineReminders = (
  assignments: Assignment[],
  {
    settings,
    hiddenCourses,
    archived,
    now = Date.now(),
    inexact = false,
  }: {
    settings: Pick<
      NotificationSettings,
      'deadlineReminders' | 'deadlineReminderOffset'
    > &
      Partial<Pick<NotificationSettings, 'classReminders'>>;
    hiddenCourses: string[];
    archived: string[];
    now?: number;
    /**
     * Android without the exact alarm permission, where reminders may be
     * late. Marked in the identifier, so they're scheduled again once it's
     * allowed.
     */
    inexact?: boolean;
  },
): PlannedReminder[] => {
  if (!settings.deadlineReminders) {
    return [];
  }
  const offset = settings.deadlineReminderOffset * 60 * 1000;
  const max = settings.classReminders
    ? DEADLINE_REMINDERS_WITH_CLASSES
    : MAX_REMINDERS;
  const { deadlines } = upcomingDeadlines(assignments, {
    hiddenCourses,
    archived,
    now: now + offset,
    limit: max,
  });
  const suffix = inexact ? ':inexact' : '';
  const due = deadlines.map((deadline): PlannedReminder => ({
    identifier: `${PREFIX}${deadline.id}:${deadline.deadline}:${settings.deadlineReminderOffset}${suffix}`,
    kind: 'due',
    date: deadline.deadline - offset,
    deadline,
  }));
  const late = lateWindows(assignments, {
    hiddenCourses,
    archived,
    now,
  }).flatMap(({ deadline, late: window }): PlannedReminder[] => {
    const remindAt = window.deadline - offset;
    return [
      ...(deadline > now
        ? [
            {
              identifier: `${PREFIX}${window.id}:late-open:${deadline}:${window.deadline}${suffix}`,
              kind: 'lateOpen' as const,
              date: deadline,
              deadline: window,
            },
          ]
        : []),
      // Closer to the deadline than the offset, the first one says it.
      ...(remindAt > now && remindAt > deadline
        ? [
            {
              identifier: `${PREFIX}${window.id}:late:${window.deadline}:${settings.deadlineReminderOffset}${suffix}`,
              kind: 'lateDue' as const,
              date: remindAt,
              deadline: window,
            },
          ]
        : []),
    ];
  });
  return [...due, ...late]
    .sort((a, b) => a.date - b.date || a.identifier.localeCompare(b.identifier))
    .slice(0, max);
};

const reminderBodies: Record<
  ReminderKind,
  (deadline: number, showsAt: number) => string
> = {
  due: (deadline, showsAt) => capitalize(deadlineDayTime(deadline, showsAt)),
  lateOpen: deadline =>
    t('notifyLateOpen', {
      date: dayjs(deadline).format(t('shortDateTimeFormat')),
    }),
  lateDue: (deadline, showsAt) =>
    capitalize(deadlineDayTime(deadline, showsAt, 'lateCloses')),
};

/**
 * A reminder's text: the assignment, its course and when it's due (the day as
 * of when it shows), as a content notification about one item reads. The
 * late kinds say when late submission closes instead. Its data keeps the
 * kind, so Remind Later can say it again as of its new time.
 */
export const reminderContent = (
  { id, title, courseName, deadline }: WidgetDeadline,
  showsAt: number,
  kind: ReminderKind = 'due',
) => ({
  title,
  subtitle: courseName,
  body: reminderBodies[kind](deadline, showsAt),
  data: { type: 'assignment', id, deadline, kind },
  categoryIdentifier: notificationCategories.deadline,
  // Stacked together in the iOS notification center.
  threadIdentifier: notificationChannels.deadlines,
  // Shown during a Focus on iOS, unless the user turns that off for learnX.
  interruptionLevel: 'timeSensitive' as const,
});

/**
 * Makes the scheduled reminders match the plan: cancels the ones no longer
 * wanted (submitted, archived, deadline moved, turned off) and schedules the
 * new ones. A reminder put off with Remind Later is kept while its assignment
 * is still open and reminders are on. Without the permission, cancels them
 * all.
 */
export const syncDeadlineReminders = async (
  assignments: Assignment[],
  options: Omit<Parameters<typeof planDeadlineReminders>[1], 'inexact'>,
) => {
  const granted = (await getNotificationPermission()) === 'granted';
  const plan = granted
    ? planDeadlineReminders(assignments, {
        ...options,
        inexact: !(await canScheduleExactAlarms()),
      })
    : [];
  const open =
    granted && options.settings.deadlineReminders
      ? [
          ...upcomingDeadlines(assignments, {
            hiddenCourses: options.hiddenCourses,
            archived: options.archived,
            now: options.now,
            limit: Infinity,
          }).deadlines.map(d => d.id),
          ...lateWindows(assignments, {
            hiddenCourses: options.hiddenCourses,
            archived: options.archived,
            now: options.now ?? Date.now(),
          }).map(w => w.late.id),
        ].map(id => `${LATER_PREFIX}${id}`)
      : [];
  const wantedLater = new Set(open);

  await reconcileScheduled(
    id => id.startsWith(PREFIX) || id.startsWith(LATER_PREFIX),
    plan.map(r => ({
      identifier: r.identifier,
      content: reminderContent(r.deadline, r.date, r.kind),
      trigger: dateTrigger(r.date, notificationChannels.deadlines),
    })),
    id => wantedLater.has(id),
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

/**
 * Shows a reminder again later, replacing one put off before, its text as of
 * when it shows again.
 */
export const remindLater = async (
  notification: Notifications.Notification,
  {
    id,
    deadline,
    kind = 'due',
  }: { id: string; deadline: number; kind?: ReminderKind },
) => {
  const date = remindLaterDate(deadline);
  if (date === null) {
    return;
  }
  const { title, subtitle } = notification.request.content;
  await Notifications.scheduleNotificationAsync({
    identifier: `${LATER_PREFIX}${id}`,
    content: reminderContent(
      { id, title: title ?? '', courseName: subtitle ?? '', deadline },
      date,
      kind,
    ),
    trigger: dateTrigger(date, notificationChannels.deadlines),
  });
};
