import dayjs from 'dayjs';
import { Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { resetCalendarSync, setLastSynced } from 'data/calendarSync';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import { openSystemSettings } from 'helpers/systemSettings';
import {
  confirmDeleteCalendars,
  useAssignmentSync,
  useCalendarExport,
  useCourseScheduleSync,
} from 'hooks/useCalendarSync';
import CalendarEvent from 'screens/CalendarEvent';

jest.mock('helpers/systemSettings', () => ({ openSystemSettings: jest.fn() }));
jest.mock('hooks/useCalendarSync', () => ({
  confirmDeleteCalendars: jest.fn(),
  useAssignmentSync: jest.fn(),
  useCalendarExport: jest.fn(),
  useCourseScheduleSync: jest.fn(),
}));

const picker = {
  open: false,
  startDate: new Date('2026-11-10T00:00:00Z'),
  endDate: new Date('2026-12-08T00:00:00Z'),
  openPicker: jest.fn(),
  closePicker: jest.fn(),
  onRangeChange: jest.fn(),
  onRangeConfirm: jest.fn(),
};
const setSyncEnabled = jest.fn();
const exportToICS = jest.fn();

const renderScreen = () =>
  render(<CalendarEvent navigation={{} as never} route={{} as never} />);

const toggle = (label: string, value: boolean) =>
  fireEvent(screen.getByRole('switch', { name: label }), 'valueChange', value);

const os = Platform.OS;

beforeEach(() => {
  resetSettings();
  jest
    .mocked(useCourseScheduleSync)
    .mockReturnValue({ syncing: false, picker });
  jest.mocked(useAssignmentSync).mockReturnValue({
    calendarSyncing: false,
    reminderSyncing: false,
    setSyncEnabled,
  });
  jest
    .mocked(useCalendarExport)
    .mockReturnValue({ exporting: false, exportToICS });
});

afterEach(() => {
  Platform.OS = os;
});

it('saves the course schedule settings and opens the range picker', async () => {
  await renderScreen();
  expect(
    screen.getByText(
      t('courseScheduleSyncCaption', { type: t('undergraduateSchedule') }),
    ),
  ).toBeTruthy();
  await toggle(t('graduate'), true);
  expect(getSettings().graduate).toBe(true);
  expect(
    screen.getByText(
      t('courseScheduleSyncCaption', { type: t('graduateSchedule') }),
    ),
  ).toBeTruthy();
  await toggle(t('courseEventOmitLocation'), true);
  expect(getSettings().courseEventOmitLocation).toBe(true);

  await userEvent.press(screen.getByText(t('syncCourseSchedule')));
  expect(picker.openPicker).toHaveBeenCalled();
});

it('asks how long before a class to alarm once class alarms are on', async () => {
  await renderScreen();
  expect(screen.queryByText(t('classAlarmBefore'))).toBeNull();
  await toggle(t('classAlarm'), true);
  expect(getSettings().alarms.courseAlarm).toBe(true);
  await fireEvent.changeText(screen.getByDisplayValue('15'), '30');
  expect(getSettings().alarms.courseAlarmOffset).toBe(30);
});

it('turns assignment sync on and off through the sync hook', async () => {
  await renderScreen();
  await toggle(t('setupCalendar'), true);
  expect(setSyncEnabled).toHaveBeenCalledWith('calendar', true);
  await toggle(t('setupReminders'), true);
  expect(setSyncEnabled).toHaveBeenCalledWith('reminder', true);
});

it('shows the event length and alarm options while calendar sync is on', async () => {
  setSetting('assignmentCalendarSync', true);
  setSetting('alarms', {
    ...getSettings().alarms,
    assignmentCalendarAlarm: true,
    assignmentCalendarSecondAlarm: true,
    assignmentReminderAlarm: true,
  });
  await renderScreen();
  for (const label of [
    'calendarEventLength',
    'assignmentCalendarAlarmOffset',
    'assignmentCalendarSecondAlarmOffset',
    'assignmentReminderAlarmOffset',
  ] as const) {
    expect(screen.getAllByText(t(label)).length).toBeGreaterThan(0);
  }
  await toggle(t('assignmentCalendarNoAlarmIfComplete'), true);
  expect(getSettings().alarms.assignmentCalendarNoAlarmIfComplete).toBe(true);
  await toggle(t('assignmentCalendarSecondAlarm'), false);
  expect(
    screen.queryByText(t('assignmentCalendarSecondAlarmOffset')),
  ).toBeNull();
});

it('leaves the Reminders section out on Android', async () => {
  Platform.OS = 'android';
  await renderScreen();
  expect(screen.queryByText(t('setupReminders'))).toBeNull();
  expect(screen.getByText(t('assignmentSyncDescription'))).toBeTruthy();
});

it('exports, deletes and opens the system settings', async () => {
  const user = userEvent.setup();
  await renderScreen();
  await user.press(screen.getByText(t('exportSyncedCalendars')));
  expect(exportToICS).toHaveBeenCalled();
  await user.press(screen.getByText(t('deleteSyncedCalendarsAndReminders')));
  expect(confirmDeleteCalendars).toHaveBeenCalled();
  await user.press(screen.getByText(t('configureCalendarAndReminder')));
  expect(openSystemSettings).toHaveBeenCalledWith('security');
});

it('saves the range picked in the picker', async () => {
  jest
    .mocked(useCourseScheduleSync)
    .mockReturnValue({ syncing: false, picker: { ...picker, open: true } });
  await renderScreen();
  await userEvent.press(screen.getByText(t('datePickerSaveLabel')));
  expect(picker.onRangeConfirm).toHaveBeenCalledWith({
    startDate: picker.startDate,
    endDate: picker.endDate,
  });
});

it('says when each sync last finished, while it is on', async () => {
  resetCalendarSync();
  const time = new Date(2026, 10, 11, 9, 30).getTime();
  setLastSynced('courseSchedule', time);
  setLastSynced('calendar', time);
  await renderScreen();
  const lastSynced = t('lastSynced', {
    time: dayjs(time).format(t('shortDateTimeFormat')),
  });
  expect(screen.getAllByText(lastSynced, { exact: false })).toHaveLength(1);

  setSetting('assignmentCalendarSync', true);
  await renderScreen();
  expect(screen.getAllByText(lastSynced, { exact: false })).toHaveLength(2);
});
