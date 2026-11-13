import dayjs from 'dayjs';
import { Platform } from 'react-native';
import {
  act,
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
import useCalendarAccess from 'hooks/useCalendarAccess';
import CalendarSettings from 'screens/CalendarSettings';
import { screenProps } from 'test-utils/screenProps';

jest.mock('helpers/systemSettings', () => ({ openSystemSettings: jest.fn() }));
jest.mock('hooks/useCalendarAccess', () => jest.fn());
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
const setCourseSyncEnabled = jest.fn();
const courseSync = {
  syncing: false,
  enabling: false,
  setSyncEnabled: setCourseSyncEnabled,
};
const exportToICS = jest.fn();

const renderScreen = () => render(<CalendarSettings {...screenProps()} />);

const toggle = (label: string, value: boolean) =>
  fireEvent(screen.getByRole('switch', { name: label }), 'valueChange', value);

const requestAccess = jest.fn();
const access = (
  overrides: Partial<ReturnType<typeof useCalendarAccess>> = {},
) =>
  jest.mocked(useCalendarAccess).mockReturnValue({
    calendar: 'granted',
    reminders: 'granted',
    request: requestAccess,
    ...overrides,
  });

beforeEach(() => {
  resetSettings();
  access();
  jest.mocked(useCourseScheduleSync).mockReturnValue({ ...courseSync, picker });
  jest.mocked(useAssignmentSync).mockReturnValue({
    calendarSyncing: false,
    reminderSyncing: false,
    setSyncEnabled,
  });
  jest
    .mocked(useCalendarExport)
    .mockReturnValue({ exporting: false, exportToICS });
});

it('turns course schedule sync on through the sync hook', async () => {
  await renderScreen();
  expect(
    screen.getByText(
      t('courseScheduleSyncCaption', { type: t('undergraduateSchedule') }),
    ),
  ).toBeTruthy();
  // Its options show only while it's on.
  expect(screen.queryByText(t('classAlarm'))).toBeNull();
  expect(screen.queryByText(t('syncCourseSchedule'))).toBeNull();
  await toggle(t('setupCourseCalendar'), true);
  expect(setCourseSyncEnabled).toHaveBeenCalledWith(true);
});

it('saves the course schedule settings and opens the range picker', async () => {
  setSetting('courseCalendarSync', true);
  setSetting('graduate', true);
  await renderScreen();
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
  setSetting('courseCalendarSync', true);
  await renderScreen();
  expect(screen.queryByText(t('classAlarmBefore'))).toBeNull();
  await toggle(t('classAlarm'), true);
  expect(getSettings().alarms.courseAlarm).toBe(true);
  await fireEvent.changeText(screen.getByDisplayValue('15'), '30');
  expect(getSettings().alarms.courseAlarmOffset).toBe(30);
});

it('turns assignment sync on and off through the sync hook', async () => {
  await renderScreen();
  expect(screen.getByText(t('assignmentSyncDescription'))).toBeTruthy();
  // Each sync's options show only while it's on.
  expect(screen.queryByText(t('assignmentCalendarAlarm'))).toBeNull();
  expect(screen.queryByText(t('assignmentReminderAlarm'))).toBeNull();
  await toggle(t('setupCalendar'), true);
  expect(setSyncEnabled).toHaveBeenCalledWith('calendar', true);
  await toggle(t('setupReminders'), true);
  expect(setSyncEnabled).toHaveBeenCalledWith('reminder', true);
});

it('shows the alert options of the syncs that are on', async () => {
  setSetting('assignmentCalendarSync', true);
  setSetting('assignmentReminderSync', true);
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
  jest.replaceProperty(Platform, 'OS', 'android');
  await renderScreen();
  expect(screen.queryByText(t('setupReminders'))).toBeNull();
  expect(screen.getByText(t('assignmentSyncDescription'))).toBeTruthy();
  expect(screen.getByText(t('calendarAccessCaption'))).toBeTruthy();
});

it('explains the system settings row with calendars and reminders on iOS', async () => {
  await renderScreen();
  expect(screen.getByText(t('calendarAndReminderAccessCaption'))).toBeTruthy();
});

it('exports, deletes and opens the system settings', async () => {
  const user = userEvent.setup();
  await renderScreen();
  await user.press(screen.getByText(t('exportSyncedCalendars')));
  expect(exportToICS).toHaveBeenCalled();
  await user.press(
    screen.getByText(t('deleteSyncedCalendarsAndRemindersEllipsis')),
  );
  expect(confirmDeleteCalendars).toHaveBeenCalled();
  await user.press(screen.getByText(t('openSystemSettings')));
  expect(openSystemSettings).toHaveBeenCalledWith('security');
});

it('saves the range picked in the picker', async () => {
  jest
    .mocked(useCourseScheduleSync)
    .mockReturnValue({ ...courseSync, picker: { ...picker, open: true } });
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
  setSetting('courseCalendarSync', true);
  await renderScreen();
  const lastSynced = t('lastSynced', {
    time: dayjs(time).format(t('shortDateTimeFormat')),
  });
  expect(screen.getAllByText(lastSynced, { exact: false })).toHaveLength(1);

  await act(() => setSetting('assignmentCalendarSync', true));
  await renderScreen();
  expect(screen.getAllByText(lastSynced, { exact: false })).toHaveLength(2);
  // On the caption's next line, not a paragraph of its own.
  const caption = t('courseScheduleSyncCaption', {
    type: t('undergraduateSchedule'),
  });
  expect(screen.getByText(`${caption}\n${lastSynced}`)).toBeTruthy();
});

describe('access', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('says nothing while the syncs are off, even without access', async () => {
    access({ calendar: 'denied', reminders: 'denied' });
    await renderScreen();
    expect(screen.queryByText(t('calendarOffCaption'))).toBeNull();
  });

  it('asks first for the access a sync that is on lacks', async () => {
    access({ calendar: 'undetermined', reminders: 'granted' });
    setSetting('assignmentCalendarSync', true);
    setSetting('assignmentReminderSync', true);
    await renderScreen();
    expect(screen.getByText(t('calendarOffCaption'))).toBeTruthy();
    expect(screen.queryByText(t('allowRemindersAccess'))).toBeNull();
    await userEvent.press(screen.getByText(t('allowCalendarAccess')));
    expect(requestAccess).toHaveBeenCalledWith('calendar');
  });

  it('names both when both are missing', async () => {
    access({ calendar: 'denied', reminders: 'denied' });
    setSetting('assignmentCalendarSync', true);
    setSetting('assignmentReminderSync', true);
    await renderScreen();
    expect(screen.getByText(t('calendarAndRemindersOffCaption'))).toBeTruthy();
    expect(screen.getByText(t('allowCalendarAccess'))).toBeTruthy();
    expect(screen.getByText(t('allowRemindersAccess'))).toBeTruthy();
  });

  it('opens the system settings once it can no longer ask', async () => {
    access({ calendar: 'granted', reminders: 'denied' });
    setSetting('assignmentReminderSync', true);
    await renderScreen();
    expect(screen.getByText(t('remindersOffCaption'))).toBeTruthy();
    await userEvent.press(screen.getByText(t('allowRemindersAccess')));
    expect(openSystemSettings).toHaveBeenCalledWith('security');
    expect(requestAccess).not.toHaveBeenCalled();
  });
});
