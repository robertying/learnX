import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { toast } from 'components/Toast';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import { postNotification } from 'helpers/notifications';
import { previewDeadlineReminder } from 'helpers/deadlineReminders';
import { openSystemSettings } from 'helpers/systemSettings';
import useNotificationPermission from 'hooks/useNotificationPermission';
import NotificationSettings from 'screens/NotificationSettings';
import { notifyContent, syncContent } from 'helpers/background';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { addSyncRun, resetSyncLog } from 'data/syncLog';
import { resetUserData, setCurrentSemester } from 'data/userData';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('hooks/useNotificationPermission', () => jest.fn());
jest.mock('helpers/systemSettings', () => ({ openSystemSettings: jest.fn() }));
jest.mock('helpers/notifications', () => ({ postNotification: jest.fn() }));
jest.mock('helpers/background', () => ({
  syncContent: jest.fn(),
  notifyContent: jest.fn(),
}));
jest.mock('helpers/deadlineReminders', () => ({
  previewDeadlineReminder: jest.fn(async () => 3),
}));
jest.mock('data/content', () => ({
  ...jest.requireActual('data/content'),
  useNotices: () => ({
    notices: [{ id: 'n1', courseName: 'Calculus', title: 'Midterm' }],
  }),
}));

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

it('leaves it off and says why when the permission is denied', async () => {
  request.mockResolvedValueOnce(false);
  await renderScreen();
  await toggle('notices', true);
  expect(getSettings().notifications.notices).toBe(false);
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
  await userEvent.press(screen.getByText(t('configureNotifications')));
  expect(openSystemSettings).toHaveBeenCalledWith('notifications');
});

it('sends a test notification about the newest notice in debug builds', async () => {
  await renderScreen();
  await userEvent.press(screen.getByText('Send a Test Notification'));
  expect(postNotification).toHaveBeenCalledWith({
    title: 'Calculus',
    body: 'Midterm',
    target: { type: 'notice', id: 'n1' },
  });
});

describe('Simulate New Content (debug builds)', () => {
  const semesterId = '2026-2027-1';
  const notices = [1, 2, 3, 4].map(i => ({ id: `n${i}` }));
  const past = '2020-01-01T00:00:00Z';
  const future = '2099-01-01T00:00:00Z';
  const assignments = [
    { id: 'open', submitted: false, deadline: future, graded: false },
    { id: 'graded', submitted: true, deadline: past, graded: true },
    { id: 'missed', submitted: false, deadline: past, graded: false },
  ];

  beforeEach(() => {
    clearQueryCache();
    resetUserData();
    resetSyncLog();
    setCurrentSemester(semesterId);
    queryClient.setQueryData(
      noticesQuery(semesterId).queryKey,
      notices as never,
    );
    queryClient.setQueryData(filesQuery(semesterId).queryKey, notices as never);
    queryClient.setQueryData(
      assignmentsQuery(semesterId).queryKey,
      assignments as never,
    );
  });

  const simulate = async () => {
    await renderScreen();
    await userEvent.press(screen.getByText('Simulate New Content'));
  };

  it('forgets some items and grades, syncs, and posts what comes back', async () => {
    jest.mocked(syncContent).mockImplementation(async () => {
      addSyncRun({
        startedAt: 0,
        duration: 1200,
        status: 'synced',
        manual: true,
      });
      return { status: 'synced', diff: 'diff' } as never;
    });
    jest.mocked(notifyContent).mockResolvedValue([1, 2] as never);
    await simulate();

    expect(queryClient.getQueryData(noticesQuery(semesterId).queryKey)).toEqual(
      [{ id: 'n4' }],
    );
    expect(
      queryClient.getQueryData(assignmentsQuery(semesterId).queryKey),
    ).toEqual([
      expect.objectContaining({ id: 'graded', graded: false }),
      expect.objectContaining({ id: 'missed' }),
    ]);
    expect(syncContent).toHaveBeenCalledWith({ manual: true });
    expect(notifyContent).toHaveBeenCalledWith('diff', { inForeground: true });
    expect(toast).toHaveBeenCalledWith('2 posted, synced in 1.2 s', 'success');
  });

  it('says why a sync failed, without posting', async () => {
    jest.mocked(syncContent).mockResolvedValue({ status: 'failed' } as never);
    await simulate();
    expect(notifyContent).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('failed', 'error');
  });

  it('does nothing before a semester, or without the permission', async () => {
    resetUserData();
    await simulate();
    expect(syncContent).not.toHaveBeenCalled();

    setCurrentSemester(semesterId);
    request.mockResolvedValueOnce(false);
    await simulate();
    expect(syncContent).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      t('notificationPermissionDenied'),
      'error',
    );
  });
});

it("shows the last background sync's result in debug builds", async () => {
  resetSyncLog();
  addSyncRun({ startedAt: 0, duration: 500, status: 'synced', manual: true });
  await renderScreen();
  expect(screen.queryByText(/Last background sync/)).toBeNull();
  await act(() =>
    addSyncRun({
      startedAt: 0,
      duration: 3000,
      status: 'failed',
      timedOut: true,
    }),
  );
  await renderScreen();
  expect(
    screen.getByText(
      /^Last background sync .*: failed in 3\.0 s, out of time$/,
    ),
  ).toBeTruthy();
});

it('previews a deadline reminder in debug builds', async () => {
  await renderScreen();
  await userEvent.press(screen.getByText('Preview a Deadline Reminder'));
  expect(toast).toHaveBeenCalledWith(
    'The next of 3 scheduled reminders shows again in 10 seconds. Leave the app to see it.',
    'success',
  );
});

it('says when there is no deadline reminder to preview', async () => {
  jest.mocked(previewDeadlineReminder).mockResolvedValueOnce(0);
  await renderScreen();
  await userEvent.press(screen.getByText('Preview a Deadline Reminder'));
  expect(toast).toHaveBeenCalledWith(
    'No deadline reminders are scheduled.',
    'warning',
  );
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

it('asks for the permission before a test notification', async () => {
  request.mockResolvedValueOnce(false);
  await renderScreen();
  await userEvent.press(screen.getByText('Send a Test Notification'));
  expect(postNotification).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(
    t('notificationPermissionDenied'),
    'error',
  );
});
