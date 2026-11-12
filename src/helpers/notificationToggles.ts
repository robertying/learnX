import type { NotificationSettings } from 'data/types/state';
import { t } from './i18n';
import type { SystemIconName } from './systemIcons';

/** A notification setting that is on or off (not an offset). */
export type NotificationToggle = Exclude<
  keyof NotificationSettings,
  'deadlineReminderOffset' | 'classReminderOffset'
>;

/**
 * Each notification switch's icon and title, shared by Settings ›
 * Notifications and the set-up page so the two read the same.
 */
export const notificationToggles: Record<
  NotificationToggle,
  { icon: SystemIconName; title: () => string }
> = {
  notices: { icon: 'notices', title: () => t('notifyNewNotices') },
  assignments: { icon: 'assignments', title: () => t('notifyNewAssignments') },
  files: { icon: 'files', title: () => t('notifyNewFiles') },
  classReminders: { icon: 'reminder', title: () => t('notifyClassReminders') },
  deadlineReminders: {
    icon: 'reminder',
    title: () => t('notifyDeadlineReminders'),
  },
  grades: { icon: 'grade', title: () => t('notifyGrades') },
  deadlineChanges: {
    icon: 'deadlineChange',
    title: () => t('notifyDeadlineChanges'),
  },
  groupSubmissions: {
    icon: 'groupSubmission',
    title: () => t('notifyGroupSubmissions'),
  },
};

/** New content, in the tabs' order: the first section on both pages. */
export const newContentToggles = ['notices', 'assignments', 'files'] as const;
