// The Calendar & Reminders settings actions, as plain async functions that
// resolve to the toast to show. hooks/useCalendarSync adds loading state.
import dayjs, { Dayjs } from 'dayjs';
import type { ToastType } from 'components/Toast';
import { ensureSession } from 'data/source';
import { fetchCalendarRange } from 'data/schedule';
import { Assignment } from 'data/types/state';
import {
  exportSyncedCalendarsToICS,
  removeCalendars,
  requireAssignmentAccess,
  requirePermission,
  saveAssignmentsToReminderOrCalendar,
} from 'services/calendar/calendars';
import { saveClassesToCalendar } from 'services/calendar/classes';
import { setLastSynced } from 'data/calendarSync';
import { calendarErrorCode } from 'services/calendar/errors';
import { exportTextFile } from 'services/files/share';
import { Platform } from 'react-native';
import { t, TranslationKey } from 'helpers/i18n';

export interface ToastMessage {
  text: string;
  type: ToastType;
}

const messageOf = (err: unknown) => (err as Error).message;

/** Android has no "full access" to calendars and needs no restart once allowed. */
const noCalendarPermission = (
  key:
    | 'assignmentSyncNoCalendarPermission'
    | 'courseScheduleSyncNoCalendarPermission'
    | 'deleteFailedNoCalendarPermission'
    | 'calendarExportNoCalendarPermission',
): ToastMessage => ({
  text: t(
    Platform.OS === 'android' ? (`${key}Android` as TranslationKey) : key,
  ),
  type: 'error',
});

export const courseSyncErrorToast = (err: unknown): ToastMessage => {
  switch (calendarErrorCode(err)) {
    case 'calendarPermission':
      return noCalendarPermission('courseScheduleSyncNoCalendarPermission');
    default:
      return { text: t('courseScheduleSyncRepetitiveError'), type: 'error' };
  }
};

export const assignmentSyncErrorToast = (err: unknown): ToastMessage => {
  switch (calendarErrorCode(err)) {
    case 'calendarPermission':
      return noCalendarPermission('assignmentSyncNoCalendarPermission');
    case 'reminderPermission':
      return { text: t('assignmentSyncNoReminderPermission'), type: 'error' };
    case 'noSource':
      return { text: t('missingCalendarSource'), type: 'error' };
    default:
      return {
        text: t('assignmentSyncFailed', { error: messageOf(err) }),
        type: 'error',
      };
  }
};

export const calendarExportErrorToast = (err: unknown): ToastMessage => {
  switch (calendarErrorCode(err)) {
    case 'calendarPermission':
      return noCalendarPermission('calendarExportNoCalendarPermission');
    case 'noEvents':
      return { text: t('calendarExportNoEvent'), type: 'warning' };
    default:
      return {
        text: t('calendarExportFailed', { error: messageOf(err) }),
        type: 'error',
      };
  }
};

export const calendarDeleteErrorToast = (err: unknown): ToastMessage => {
  switch (calendarErrorCode(err)) {
    case 'calendarPermission':
      return noCalendarPermission('deleteFailedNoCalendarPermission');
    case 'reminderPermission':
      return { text: t('deleteFailedNoReminderPermission'), type: 'error' };
    default:
      return {
        text: t('deleteFailed', { error: messageOf(err) }),
        type: 'error',
      };
  }
};

/**
 * Fetches the course schedule in the range afresh, through the same week
 * queries as Today's timetable, and writes it to the calendar. The days then
 * follow the timetable and the class settings (services/calendar/classes).
 */
export const syncCourseSchedule = async (
  start: Dayjs,
  end: Dayjs,
  graduate: boolean,
): Promise<ToastMessage> => {
  try {
    await ensureSession();

    // Week by week, as Today's timetable; it rejects only when every week
    // failed, and the calendar keeps its entries for the weeks that did.
    const { classes, failedRanges } = await fetchCalendarRange(
      start,
      end,
      graduate,
      { fresh: true },
    );

    if (classes.length === 0 && failedRanges.length === 0) {
      return { text: t('courseScheduleSyncNoCourse'), type: 'warning' };
    }
    await saveClassesToCalendar(
      classes,
      {
        first: start.format('YYYY-MM-DD'),
        last: end.format('YYYY-MM-DD'),
        graduate,
      },
      failedRanges,
    );
    setLastSynced('courseSchedule');
    if (failedRanges.length > 0) {
      return { text: t('courseScheduleSyncPartial'), type: 'warning' };
    }
    return { text: t('courseScheduleSyncSucceeded'), type: 'success' };
  } catch (err) {
    return courseSyncErrorToast(err);
  }
};

/**
 * Asks for the calendar access course calendar sync needs, as the user turns
 * it on; the writes follow the setting (services/calendar/classes). The toast
 * to show when the access is denied.
 */
export const allowCourseCalendarSync = async (): Promise<
  ToastMessage | undefined
> => {
  try {
    await requirePermission('calendar', { ask: true });
  } catch (err) {
    return courseSyncErrorToast(err);
  }
};

/** Assignments whose deadline is still ahead */
export const upcomingAssignments = (
  assignments: Assignment[],
  now: Dayjs = dayjs(),
) => assignments.filter(assignment => dayjs(assignment.deadline).isAfter(now));

/**
 * Writes assignments to the calendar or reminders and deletes the entries of
 * `removed` (archived or hidden); a toast only on failure
 */
export const syncAssignments = async (
  type: 'calendar' | 'reminder',
  assignments: Assignment[],
  removed: string[] = [],
  {
    automatic = false,
  }: {
    /**
     * Started by the app, not the user: it doesn't ask for the permission,
     * and without it skips quietly (Settings › Calendar says so at the top).
     */
    automatic?: boolean;
  } = {},
): Promise<ToastMessage | undefined> => {
  try {
    await saveAssignmentsToReminderOrCalendar(type, assignments, removed, {
      ask: !automatic,
    });
    setLastSynced(type);
  } catch (err) {
    const code = calendarErrorCode(err);
    if (
      automatic &&
      (code === 'calendarPermission' || code === 'reminderPermission')
    ) {
      return undefined;
    }
    return assignmentSyncErrorToast(err);
  }
};

/**
 * Asks for the access assignment sync to the calendar or Reminders needs, as
 * the user turns it on; the sync itself follows the setting
 * (services/surfaces). The toast to show when the access is denied.
 */
export const allowAssignmentSync = async (
  type: 'calendar' | 'reminder',
): Promise<ToastMessage | undefined> => {
  try {
    await requireAssignmentAccess(type, { ask: true });
  } catch (err) {
    return assignmentSyncErrorToast(err);
  }
};

/** Shares (or on Mac, saves where people pick) the synced calendars as learnX.ics */
export const exportCalendars = async (): Promise<ToastMessage | undefined> => {
  try {
    const ics = await exportSyncedCalendarsToICS();
    await exportTextFile('learnX.ics', ics, 'text/calendar');
  } catch (err) {
    return calendarExportErrorToast(err);
  }
};

export const deleteCalendars = async (): Promise<ToastMessage> => {
  try {
    await removeCalendars();
    return { text: t('deleteSucceeded'), type: 'success' };
  } catch (err) {
    return calendarDeleteErrorToast(err);
  }
};
