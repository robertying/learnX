import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { toast } from 'components/Toast';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import { openSystemSettings } from 'helpers/systemSettings';
import useNotificationPermission from 'hooks/useNotificationPermission';
import NotificationSettings from 'screens/NotificationSettings';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('hooks/useNotificationPermission', () => jest.fn());
jest.mock('helpers/systemSettings', () => ({ openSystemSettings: jest.fn() }));

const request = jest.fn(async () => true);
const requestExact = jest.fn();
const permission = (
  overrides: Partial<ReturnType<typeof useNotificationPermission>> = {},
) =>
  jest.mocked(useNotificationPermission).mockReturnValue({
    permission: 'granted',
    request,
    exactAlarms: true,
    requestExact,
    ...overrides,
  });

const renderScreen = () =>
  render(<NotificationSettings navigation={{} as never} route={{} as never} />);

const toggle = (key: string, value: boolean) =>
  fireEvent(screen.getByTestId(`notifications-${key}`), 'valueChange', value);

beforeEach(() => {
  resetSettings();
  permission();
});

it('turns a notification on once the permission is granted', async () => {
  await renderScreen();
  await toggle('files', true);
  expect(request).toHaveBeenCalled();
  expect(getSettings().notifications.files).toBe(true);
});

it('keeps it on and says why when the permission is denied', async () => {
  request.mockResolvedValueOnce(false);
  await renderScreen();
  await toggle('notices', true);
  expect(getSettings().notifications.notices).toBe(true);
  expect(toast).toHaveBeenCalledWith(
    t('notificationPermissionDenied'),
    'error',
  );
});

it('turns one off without asking', async () => {
  setSetting('notifications', { ...getSettings().notifications, grades: true });
  await renderScreen();
  await toggle('grades', false);
  expect(request).not.toHaveBeenCalled();
  expect(getSettings().notifications.grades).toBe(false);
});

it('shows the reminder offset while reminders are on', async () => {
  await renderScreen();
  expect(screen.queryByText(t('deadlineReminderOffset'))).toBeNull();
  await toggle('deadlineReminders', true);
  expect(screen.getByText(t('deadlineReminderOffset'))).toBeTruthy();
});

it('offers exact reminders when Android holds them back', async () => {
  permission({ exactAlarms: false });
  setSetting('notifications', {
    ...getSettings().notifications,
    deadlineReminders: true,
  });
  await renderScreen();
  expect(
    screen.getByText(t('exactRemindersCaption'), { exact: false }),
  ).toBeTruthy();
  await userEvent.press(screen.getByText(t('allowExactReminders')));
  expect(requestExact).toHaveBeenCalled();
});

it('says the permission is off while it can still be asked for', async () => {
  permission({ permission: 'undetermined' });
  setSetting('notifications', { ...getSettings().notifications, files: true });
  await renderScreen();
  expect(
    screen.getByText(t('notificationPermissionDenied'), { exact: false }),
  ).toBeTruthy();
});

it('says the permission is off when something is on but denied', async () => {
  permission({ permission: 'denied' });
  setSetting('notifications', { ...getSettings().notifications, files: true });
  await renderScreen();
  expect(
    screen.getByText(t('notificationPermissionDenied'), { exact: false }),
  ).toBeTruthy();
});

it('opens the system notification settings', async () => {
  await renderScreen();
  expect(screen.getByText(t('notificationAccessCaption'))).toBeTruthy();
  await userEvent.press(screen.getByText(t('openSystemSettings')));
  expect(openSystemSettings).toHaveBeenCalledWith('notifications');
});

it('changes the reminder offset', async () => {
  setSetting('notifications', {
    ...getSettings().notifications,
    deadlineReminders: true,
  });
  await renderScreen();
  await fireEvent(
    screen.getByLabelText(t('deadlineReminderOffset')),
    'valueChange',
    30,
  );
  expect(getSettings().notifications.deadlineReminderOffset).toBe(30);
});

it('puts class reminders before the assignment rows, as Calendar does', async () => {
  await renderScreen();
  const switches = screen
    .getAllByRole('switch')
    .map(item => item.props.accessibilityLabel);
  expect(switches.indexOf(t('notifyClassReminders'))).toBeLessThan(
    switches.indexOf(t('notifyDeadlineReminders')),
  );
  expect(screen.getByText(t('notifyClassRemindersCaption'))).toBeTruthy();
});

it('turns class reminders on and changes their offset', async () => {
  await renderScreen();
  expect(screen.queryByText(t('classReminderOffset'))).toBeNull();
  await toggle('classReminders', true);
  expect(getSettings().notifications.classReminders).toBe(true);
  await fireEvent(
    screen.getByLabelText(t('classReminderOffset')),
    'valueChange',
    10,
  );
  expect(getSettings().notifications.classReminderOffset).toBe(10);
});

it('offers exact reminders for class reminders too', async () => {
  permission({ exactAlarms: false });
  setSetting('notifications', {
    ...getSettings().notifications,
    classReminders: true,
  });
  await renderScreen();
  expect(screen.getByText(t('allowExactReminders'))).toBeTruthy();
});

it('toggles group submissions', async () => {
  await renderScreen();
  await toggle('groupSubmissions', true);
  expect(getSettings().notifications.groupSubmissions).toBe(true);
});
