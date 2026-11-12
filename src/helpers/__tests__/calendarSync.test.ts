import dayjs from 'dayjs';
import DeviceInfo from 'constants/DeviceInfo';
import { resetCalendarSync, useCalendarSyncStore } from 'data/calendarSync';
import { ensureSession } from 'data/source';
import { fetchCalendarRange } from 'data/schedule';
import { Assignment } from 'data/types/state';
import {
  assignmentSyncErrorToast,
  calendarDeleteErrorToast,
  calendarExportErrorToast,
  courseSyncErrorToast,
  deleteCalendars,
  exportCalendars,
  syncAssignments,
  syncCourseSchedule,
  upcomingAssignments,
} from 'helpers/calendarSync';
import {
  exportSyncedCalendarsToICS,
  removeCalendars,
  saveAssignmentsToReminderOrCalendar,
  saveCoursesToCalendar,
} from 'helpers/event';
import { exportTextFile } from 'helpers/files/share';
import { CalendarError, CalendarErrorCode } from 'helpers/calendarError';
import { t } from 'helpers/i18n';

jest.mock('data/source', () => ({
  ensureSession: jest.fn(async () => {}),
}));
jest.mock('data/schedule', () => ({ fetchCalendarRange: jest.fn() }));
jest.mock('helpers/event', () => ({
  exportSyncedCalendarsToICS: jest.fn(),
  removeCalendars: jest.fn(),
  saveAssignmentsToReminderOrCalendar: jest.fn(),
  saveCoursesToCalendar: jest.fn(),
}));
jest.mock('helpers/files/share', () => ({ exportTextFile: jest.fn() }));
jest.mock('constants/DeviceInfo', () => ({ isMac: jest.fn(() => false) }));

const fail = (code: CalendarErrorCode) => async () => {
  throw new CalendarError(code);
};

describe('error toasts', () => {
  const error = (code: CalendarErrorCode) => new CalendarError(code);

  it('maps course sync errors', () => {
    expect(courseSyncErrorToast(error('calendarPermission'))).toEqual({
      text: t('courseScheduleSyncNoCalendarPermission'),
      type: 'error',
    });
    expect(courseSyncErrorToast(new Error('Network'))).toEqual({
      text: t('courseScheduleSyncRepetitiveError'),
      type: 'error',
    });
  });

  it('maps assignment sync errors, including the native permission error', () => {
    const noCalendar = {
      text: t('assignmentSyncNoCalendarPermission'),
      type: 'error',
    };
    expect(assignmentSyncErrorToast(error('calendarPermission'))).toEqual(
      noCalendar,
    );
    // expo-calendar's own, when the permission goes between check and write
    for (const code of ['E_MISSING_PERMISSIONS', 'ERR_MISSING_PERMISSIONS']) {
      expect(
        assignmentSyncErrorToast(Object.assign(new Error('Denied'), { code })),
      ).toEqual(noCalendar);
    }
    expect(assignmentSyncErrorToast(error('reminderPermission'))).toEqual({
      text: t('assignmentSyncNoReminderPermission'),
      type: 'error',
    });
    expect(assignmentSyncErrorToast(error('noSource'))).toEqual({
      text: t('missingCalendarSource'),
      type: 'error',
    });
    expect(assignmentSyncErrorToast(new Error('Boom'))).toEqual({
      text: t('assignmentSyncFailed') + 'Boom',
      type: 'error',
    });
  });

  it('maps export errors', () => {
    expect(calendarExportErrorToast(error('calendarPermission'))).toEqual({
      text: t('calendarExportNoCalendarPermission'),
      type: 'error',
    });
    expect(calendarExportErrorToast(error('noEvents'))).toEqual({
      text: t('calendarExportNoEvent'),
      type: 'warning',
    });
    expect(calendarExportErrorToast(new Error('Boom'))).toEqual({
      text: t('calendarExportFailed') + 'Boom',
      type: 'error',
    });
  });

  it('maps delete errors', () => {
    expect(calendarDeleteErrorToast(error('calendarPermission'))).toEqual({
      text: t('deleteFailedNoCalendarPermission'),
      type: 'error',
    });
    expect(calendarDeleteErrorToast(error('reminderPermission'))).toEqual({
      text: t('deleteFailedNoReminderPermission'),
      type: 'error',
    });
    expect(calendarDeleteErrorToast(new Error('Boom'))).toEqual({
      text: t('deleteFailed') + 'Boom',
      type: 'error',
    });
  });
});

describe('syncCourseSchedule', () => {
  const start = dayjs('2026-03-01');
  const end = dayjs('2026-03-28');

  it('fetches the range and saves the events', async () => {
    const events = [{ courseName: 'Calculus' }];
    jest
      .mocked(fetchCalendarRange)
      .mockResolvedValue({ classes: events, failedRanges: [] } as never);

    await expect(syncCourseSchedule(start, end, true)).resolves.toEqual({
      text: t('courseScheduleSyncSucceeded'),
      type: 'success',
    });
    expect(ensureSession).toHaveBeenCalled();
    expect(fetchCalendarRange).toHaveBeenCalledWith(start, end, true);
    expect(saveCoursesToCalendar).toHaveBeenCalledWith(events, start, end, []);
    expect(
      useCalendarSyncStore.getState().lastSynced?.courseSchedule,
    ).toBeGreaterThan(0);
  });

  it('saves the weeks that came back and warns about the rest', async () => {
    const events = [{ courseName: 'Calculus' }];
    const failedRanges = [{ startDate: '20260315', endDate: '20260328' }];
    jest
      .mocked(fetchCalendarRange)
      .mockResolvedValue({ classes: events, failedRanges } as never);

    await expect(syncCourseSchedule(start, end, false)).resolves.toEqual({
      text: t('courseScheduleSyncPartial'),
      type: 'warning',
    });
    expect(saveCoursesToCalendar).toHaveBeenCalledWith(
      events,
      start,
      end,
      failedRanges,
    );
  });

  it('warns when there are no courses', async () => {
    jest
      .mocked(fetchCalendarRange)
      .mockResolvedValue({ classes: [], failedRanges: [] });

    await expect(syncCourseSchedule(start, end, false)).resolves.toEqual({
      text: t('courseScheduleSyncNoCourse'),
      type: 'warning',
    });
    expect(saveCoursesToCalendar).not.toHaveBeenCalled();
  });

  it('turns failures into toasts', async () => {
    jest
      .mocked(fetchCalendarRange)
      .mockResolvedValue({ classes: [{}], failedRanges: [] } as never);
    jest
      .mocked(saveCoursesToCalendar)
      .mockImplementation(fail('calendarPermission'));

    await expect(syncCourseSchedule(start, end, false)).resolves.toEqual({
      text: t('courseScheduleSyncNoCalendarPermission'),
      type: 'error',
    });
  });
});

describe('upcomingAssignments', () => {
  it('keeps assignments due after now', () => {
    const now = dayjs('2026-03-15T12:00:00Z');
    const assignments = [
      { id: 'past', deadline: '2026-03-15T11:59:00Z' },
      { id: 'due', deadline: '2026-03-15T12:01:00Z' },
    ] as Assignment[];
    expect(upcomingAssignments(assignments, now).map(a => a.id)).toEqual([
      'due',
    ]);
  });
});

describe('syncAssignments', () => {
  beforeEach(() => resetCalendarSync());

  it('saves and shows nothing on success', async () => {
    const assignments = [{ id: 'a1' }] as Assignment[];
    await expect(
      syncAssignments('reminder', assignments),
    ).resolves.toBeUndefined();
    expect(saveAssignmentsToReminderOrCalendar).toHaveBeenCalledWith(
      'reminder',
      assignments,
      [],
      { ask: true },
    );
    expect(useCalendarSyncStore.getState().lastSynced).toEqual({
      reminder: expect.any(Number),
    });
  });

  it('turns failures into toasts', async () => {
    jest
      .mocked(saveAssignmentsToReminderOrCalendar)
      .mockImplementation(fail('noSource'));
    await expect(syncAssignments('calendar', [])).resolves.toEqual({
      text: t('missingCalendarSource'),
      type: 'error',
    });
    expect(useCalendarSyncStore.getState().lastSynced).toBeUndefined();
  });

  it("skips quietly without access when the app started it, and doesn't ask", async () => {
    jest
      .mocked(saveAssignmentsToReminderOrCalendar)
      .mockImplementation(fail('calendarPermission'));
    await expect(
      syncAssignments('calendar', [], [], { automatic: true }),
    ).resolves.toBeUndefined();
    expect(saveAssignmentsToReminderOrCalendar).toHaveBeenLastCalledWith(
      'calendar',
      [],
      [],
      { ask: false },
    );
    // Other failures still show.
    jest
      .mocked(saveAssignmentsToReminderOrCalendar)
      .mockImplementation(fail('noSource'));
    await expect(
      syncAssignments('calendar', [], [], { automatic: true }),
    ).resolves.toMatchObject({ type: 'error' });
  });
});

describe('exportCalendars', () => {
  it('exports learnX.ics without a toast outside Mac', async () => {
    jest.mocked(exportSyncedCalendarsToICS).mockResolvedValue('ICS');

    await expect(exportCalendars()).resolves.toBeUndefined();
    expect(exportTextFile).toHaveBeenCalledWith(
      'learnX.ics',
      'ICS',
      'text/calendar',
    );
  });

  it('says where the file went on Mac', async () => {
    jest.mocked(exportSyncedCalendarsToICS).mockResolvedValue('ICS');
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);

    await expect(exportCalendars()).resolves.toEqual({
      text: t('calendarExportSavedToDownloads'),
      type: 'success',
    });
  });

  it('turns failures into toasts', async () => {
    jest
      .mocked(exportSyncedCalendarsToICS)
      .mockImplementation(fail('noEvents'));

    await expect(exportCalendars()).resolves.toEqual({
      text: t('calendarExportNoEvent'),
      type: 'warning',
    });
    expect(exportTextFile).not.toHaveBeenCalled();
  });
});

describe('deleteCalendars', () => {
  it('reports success and failure', async () => {
    await expect(deleteCalendars()).resolves.toEqual({
      text: t('deleteSucceeded'),
      type: 'success',
    });

    jest.mocked(removeCalendars).mockImplementation(fail('reminderPermission'));
    await expect(deleteCalendars()).resolves.toEqual({
      text: t('deleteFailedNoReminderPermission'),
      type: 'error',
    });
  });
});
