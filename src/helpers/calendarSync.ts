// The Calendar & Reminders settings actions, as plain async functions that
// resolve to the toast to show. hooks/useCalendarSync adds loading state.
import dayjs, { Dayjs } from 'dayjs';
import type { ToastType } from 'components/Toast';
import DeviceInfo from 'constants/DeviceInfo';
import { dataSource, ensureSession } from 'data/source';
import { Assignment } from 'data/types/state';
import {
  exportSyncedCalendarsToICS,
  removeCalendars,
  saveAssignmentsToReminderOrCalendar,
  saveCoursesToCalendar,
} from './event';
import { setLastSynced } from 'data/calendarSync';
import { calendarErrorCode } from './calendarError';
import { exportTextFile } from './files/share';
import { Platform } from 'react-native';
import { t, TranslationKey } from './i18n';

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
        text: t('assignmentSyncFailed') + messageOf(err),
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
        text: t('calendarExportFailed') + messageOf(err),
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
      return { text: t('deleteFailed') + messageOf(err), type: 'error' };
  }
};

/** Fetches the course schedule in the range and writes it to the calendar */
export const syncCourseSchedule = async (
  start: Dayjs,
  end: Dayjs,
  graduate: boolean,
): Promise<ToastMessage> => {
  try {
    await ensureSession();

    // Long ranges are fetched a few weeks at a time; it rejects only when
    // every window failed.
    const { events, failedRanges } = await dataSource.getCalendar(
      start.format('YYYYMMDD'),
      end.format('YYYYMMDD'),
      { graduate },
    );

    if (events.length === 0 && failedRanges.length === 0) {
      return { text: t('courseScheduleSyncNoCourse'), type: 'warning' };
    }
    await saveCoursesToCalendar(events, start, end, failedRanges);
    setLastSynced('courseSchedule');
    if (failedRanges.length > 0) {
      return { text: t('courseScheduleSyncPartial'), type: 'warning' };
    }
    return { text: t('courseScheduleSyncSucceeded'), type: 'success' };
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

/** Shares (or on Mac, saves) the synced calendars as learnX.ics */
export const exportCalendars = async (): Promise<ToastMessage | undefined> => {
  try {
    const ics = await exportSyncedCalendarsToICS();
    await exportTextFile('learnX.ics', ics, 'text/calendar');
    if (DeviceInfo.isMac()) {
      return { text: t('calendarExportSavedToDownloads'), type: 'success' };
    }
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
