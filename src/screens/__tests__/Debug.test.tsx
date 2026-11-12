import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { toast } from 'components/Toast';
import { useCredentialsStore } from 'data/credentials';
import { t } from 'helpers/i18n';
import { postNotification } from 'services/notifications';
import { previewScheduledReminder } from 'services/notificationSamples';
import {
  getServerWritesAllowed,
  setServerWritesAllowed,
} from 'helpers/serverWrites';
import useNotificationPermission from 'hooks/useNotificationPermission';
import Debug from 'screens/Debug';
import { notifyContent, syncContent } from 'services/background';
import { assignmentsQuery, filesQuery, noticesQuery } from 'data/content';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { addSyncRun, resetSyncLog } from 'data/syncLog';
import { resetUserData, setCurrentSemester } from 'data/userData';
import { screenProps } from 'test-utils/screenProps';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('hooks/useNotificationPermission', () => jest.fn());
jest.mock('services/notifications', () => ({ postNotification: jest.fn() }));
jest.mock('services/background', () => ({
  syncContent: jest.fn(),
  notifyContent: jest.fn(),
}));
jest.mock('services/notificationSamples', () => ({
  ...jest.requireActual('services/notificationSamples'),
  previewScheduledReminder: jest.fn(async (kind: string) =>
    kind === 'deadline' ? 3 : 0,
  ),
}));
jest.mock('data/content', () => ({
  ...jest.requireActual('data/content'),
  useNotices: () => ({
    notices: [{ id: 'n1', courseName: 'Calculus', title: 'Midterm' }],
  }),
}));
const mockShow = jest.fn();
jest.mock('hooks/useDetailNavigator', () => ({
  useShowDetail: jest.fn(() => mockShow),
}));

const request = jest.fn(async () => true);

const renderScreen = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <Debug {...screenProps()} />
    </QueryClientProvider>,
  );

const credentials = (username: string) =>
  useCredentialsStore.setState({
    credentials: {
      username,
      password: 'p',
      fingerPrint: '',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });

beforeEach(() => {
  credentials('2020000000');
  jest.mocked(useNotificationPermission).mockReturnValue({
    permission: 'granted',
    request,
    exactAlarms: true,
    requestExact: jest.fn(),
  });
});

afterEach(() =>
  act(() => {
    useCredentialsStore.setState({ credentials: null });
    setServerWritesAllowed(false);
  }),
);

it('lets a real account allow server writes', async () => {
  await renderScreen();
  expect(screen.queryByTestId('debug-mock-network')).toBeNull();
  await fireEvent(
    screen.getByTestId('debug-allow-server-writes'),
    'valueChange',
    true,
  );
  expect(getServerWritesAllowed()).toBe(true);
});

it('offers network emulation instead for the mock account', async () => {
  credentials('mock-user');
  await renderScreen();
  expect(screen.queryByTestId('debug-allow-server-writes')).toBeNull();
  await userEvent.press(screen.getByTestId('debug-mock-network'));
  expect(mockShow).toHaveBeenCalledWith('MockNetwork');
});

it('sends a test notification about the newest notice', async () => {
  await renderScreen();
  await userEvent.press(screen.getByText('Send a Test Notification'));
  // In the format a sync posts it in.
  expect(postNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Midterm',
      subtitle: 'Calculus',
      body: 'New notice',
      target: { type: 'notice', id: 'n1' },
    }),
  );
});

describe('Simulate New Content', () => {
  const semesterId = '2026-2027-1';
  const notices = [1, 2, 3, 4].map(i => ({ id: `n${i}` }));
  const past = '2020-01-01T00:00:00Z';
  const future = '2099-01-01T00:00:00Z';
  const assignments = [
    { id: 'open', submitted: false, deadline: future, graded: false },
    { id: 'graded', submitted: true, deadline: past, graded: true },
    { id: 'missed', submitted: false, deadline: past, graded: false },
    {
      id: 'group',
      submitted: true,
      deadline: past,
      graded: false,
      completionType: 2,
    },
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

  it('forgets some items, grades and group submissions, syncs, and posts what comes back', async () => {
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
      expect.objectContaining({ id: 'group', submitted: false }),
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

    await act(() => setCurrentSemester(semesterId));
    request.mockResolvedValueOnce(false);
    await simulate();
    expect(syncContent).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      t('notificationPermissionDenied'),
      'error',
    );
  });
});

it("shows the last background sync's result", async () => {
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

it('previews a deadline reminder', async () => {
  await renderScreen();
  await userEvent.press(screen.getByText('Preview a Deadline Reminder'));
  expect(toast).toHaveBeenCalledWith(
    'The next of 3 scheduled reminders shows again in 10 seconds. Leave the app to see it.',
    'success',
  );
});

it('says when there is no deadline reminder to preview', async () => {
  jest.mocked(previewScheduledReminder).mockResolvedValueOnce(0);
  await renderScreen();
  await userEvent.press(screen.getByText('Preview a Deadline Reminder'));
  expect(toast).toHaveBeenCalledWith(
    'No deadline reminders are scheduled.',
    'warning',
  );
});

it('says when there is no class reminder to preview', async () => {
  await renderScreen();
  await userEvent.press(screen.getByText('Preview a Class Reminder'));
  expect(toast).toHaveBeenCalledWith(
    'No class reminders are scheduled.',
    'warning',
  );
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
