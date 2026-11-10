import { Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { toast } from 'components/Toast';
import { useAppStateStore } from 'data/appState';
import { getSettings, resetSettings } from 'data/settings';
import { t } from 'helpers/i18n';
import { useAssignmentSync } from 'hooks/useCalendarSync';
import useNotificationPermission from 'hooks/useNotificationPermission';
import Setup from 'screens/Setup';
import packageJson from '../../../package.json';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('hooks/useNotificationPermission', () => jest.fn());
jest.mock('hooks/useCalendarSync', () => ({ useAssignmentSync: jest.fn() }));

const request = jest.fn(async () => true);
const setSyncEnabled = jest.fn(async () => {});
const navigation = { goBack: jest.fn() };

const renderScreen = () =>
  render(<Setup navigation={navigation as never} route={{} as never} />);
const toggle = (label: string, value: boolean) =>
  fireEvent(screen.getByRole('switch', { name: label }), 'valueChange', value);

const os = Platform.OS;
beforeEach(() => {
  resetSettings();
  useAppStateStore.setState({ setupSeen: false, whatsNewSeenVersion: null });
  jest.mocked(useNotificationPermission).mockReturnValue({ request } as never);
  jest.mocked(useAssignmentSync).mockReturnValue({ setSyncEnabled } as never);
});
afterEach(() => {
  Platform.OS = os;
});

it("marks itself and this version's What's New seen once shown", async () => {
  await renderScreen();
  expect(useAppStateStore.getState()).toMatchObject({
    setupSeen: true,
    whatsNewSeenVersion: packageJson.version,
  });
});

it("groups new content in the tabs' order, then assignments, then calendar", async () => {
  await renderScreen();
  const titles = screen
    .getAllByRole('switch')
    .map(item => item.props.accessibilityLabel);
  expect(titles).toEqual([
    t('notifyNewNotices'),
    t('notifyNewAssignments'),
    t('notifyNewFiles'),
    t('notifyDeadlineReminders'),
    t('notifyGrades'),
    t('setupCalendar'),
    t('setupReminders'),
  ]);
  for (const section of [
    'setupNewContent',
    'assignments',
    'calendarsAndReminders',
    'setupCaption',
  ] as const) {
    expect(screen.getByText(t(section))).toBeTruthy();
  }
});

it('offers only calendar sync on Android, which has no Reminders', async () => {
  Platform.OS = 'android';
  await renderScreen();
  expect(screen.getByText(t('setupCalendarSection'))).toBeTruthy();
  expect(screen.queryByText(t('setupReminders'))).toBeNull();
});

it('turns on the chosen notifications once allowed, and closes', async () => {
  await renderScreen();
  await toggle(t('notifyNewFiles'), false);
  await toggle(t('notifyGrades'), false);
  await userEvent.press(screen.getByTestId('setup-done'));
  expect(request).toHaveBeenCalled();
  expect(getSettings().notifications).toMatchObject({
    notices: true,
    files: false,
    assignments: true,
    grades: false,
    deadlineChanges: true,
    deadlineReminders: true,
  });
  expect(setSyncEnabled).not.toHaveBeenCalled();
  expect(navigation.goBack).toHaveBeenCalled();
});

it('keeps notifications off when the permission is denied', async () => {
  request.mockResolvedValueOnce(false);
  await renderScreen();
  await userEvent.press(screen.getByTestId('setup-done'));
  expect(getSettings().notifications.notices).toBe(false);
  expect(toast).toHaveBeenCalledWith(
    t('notificationPermissionDenied'),
    'error',
  );
  expect(navigation.goBack).toHaveBeenCalled();
});

it("doesn't ask with every notification off, and turns calendar and Reminders sync on", async () => {
  await renderScreen();
  for (const label of [
    'notifyNewNotices',
    'notifyNewAssignments',
    'notifyNewFiles',
    'notifyDeadlineReminders',
    'notifyGrades',
  ] as const) {
    await toggle(t(label), false);
  }
  await toggle(t('setupCalendar'), true);
  await toggle(t('setupReminders'), true);
  await userEvent.press(screen.getByTestId('setup-done'));
  expect(request).not.toHaveBeenCalled();
  expect(setSyncEnabled).toHaveBeenCalledWith('calendar', true);
  expect(setSyncEnabled).toHaveBeenCalledWith('reminder', true);
});

it('closes without changes on Not Now, on either platform', async () => {
  for (const platform of ['ios', 'android'] as const) {
    Platform.OS = platform;
    await renderScreen();
    await userEvent.press(screen.getByTestId('setup-not-now'));
  }
  expect(navigation.goBack).toHaveBeenCalledTimes(2);
  expect(request).not.toHaveBeenCalled();
  expect(getSettings().notifications.notices).toBe(false);
});
