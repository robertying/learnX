import { CalendarError } from 'services/calendar/errors';
import {
  assignmentSyncErrorToast,
  calendarDeleteErrorToast,
  calendarExportErrorToast,
  courseSyncErrorToast,
} from 'services/calendar/actions';
import { calendarSettingsTitle } from 'helpers/calendar/details';
import { t } from 'helpers/i18n';

jest.mock('data/source', () => ({
  dataSource: { getCalendar: jest.fn() },
  ensureSession: jest.fn(async () => {}),
}));
jest.mock('services/files/share', () => ({ exportTextFile: jest.fn() }));

const noCalendar = new CalendarError('calendarPermission');

it('asks for calendar access without iOS full access or a restart', () => {
  expect(courseSyncErrorToast(noCalendar).text).toBe(
    t('courseScheduleSyncNoCalendarPermissionAndroid'),
  );
  expect(assignmentSyncErrorToast(noCalendar).text).toBe(
    t('assignmentSyncNoCalendarPermissionAndroid'),
  );
  expect(calendarExportErrorToast(noCalendar).text).toBe(
    t('calendarExportNoCalendarPermissionAndroid'),
  );
  expect(calendarDeleteErrorToast(noCalendar).text).toBe(
    t('deleteFailedNoCalendarPermissionAndroid'),
  );
});

it('names the settings screen Calendar, without Reminders', () => {
  expect(calendarSettingsTitle()).toBe(t('setupCalendarSection'));
});
