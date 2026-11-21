import { act, render, screen, userEvent } from '@testing-library/react-native';
import SyncStatus, { SyncStatusSection } from 'components/SyncStatus';
import { initialAuth, useAuthStore } from 'data/auth';
import { queryClient } from 'data/queryClient';
import { queryKeys } from 'data/queryKeys';
import { resetUserData, useUserDataStore } from 'data/userData';
import { t } from 'helpers/i18n';

const now = Date.parse('2026-11-10T08:00:00Z');
const semesterId = '2026-2027-1';

/** The semester's lists, last fetched at these times (ms). */
const fetchedAt = (...times: number[]) =>
  [
    queryKeys.courses(semesterId),
    queryKeys.content('notices', semesterId),
    queryKeys.content('assignments', semesterId),
    queryKeys.content('files', semesterId),
  ].forEach((key, i) =>
    queryClient.setQueryData(key, [], { updatedAt: times[i] ?? times[0] }),
  );

beforeEach(() => {
  jest.useFakeTimers({ now });
  useUserDataStore.setState({ currentSemester: semesterId });
});

afterEach(() => {
  useAuthStore.setState(initialAuth);
  queryClient.clear();
  resetUserData();
});

it('stays hidden while logged in or before a login has failed', async () => {
  fetchedAt(now);
  await render(<SyncStatus />);
  expect(screen.queryByTestId('sync-status')).toBeNull();
  await act(() => useAuthStore.setState({ loggedIn: true }));
  expect(screen.queryByTestId('sync-status')).toBeNull();
});

it('says it is offline and how old the data is', async () => {
  useAuthStore.setState({ failure: 'offline' });
  fetchedAt(now - 5 * 60 * 1000);
  await render(<SyncStatus />);
  expect(screen.getByText(t('syncStatusOffline'))).toBeTruthy();
  expect(
    screen.getByText(t('syncStatusUpdated', { time: '5 minutes ago' })),
  ).toBeTruthy();
  expect(screen.queryByTestId('sync-status-relogin')).toBeNull();
});

// The clock the row reads only moves at each minute, so data fetched since
// then is a few seconds ahead of it.
it('says data fetched this minute was updated just now', async () => {
  jest.setSystemTime(now + 30 * 1000);
  useAuthStore.setState({ failure: 'offline' });
  fetchedAt(now + 30 * 1000);
  await render(<SyncStatus />);
  expect(
    screen.getByText(t('syncStatusUpdated', { time: 'a few seconds ago' })),
  ).toBeTruthy();
});

// Each list is refreshed on its own, so they were fetched at different times;
// every screen says how old the oldest is.
it('says how old the oldest list is', async () => {
  useAuthStore.setState({ failure: 'offline' });
  fetchedAt(
    now - 12 * 60 * 60 * 1000,
    now - 5 * 60 * 60 * 1000,
    now - 13 * 60 * 60 * 1000,
    now - 60 * 1000,
  );
  await render(<SyncStatus />);
  expect(
    screen.getByText(t('syncStatusUpdated', { time: '13 hours ago' })),
  ).toBeTruthy();
});

it('leaves the age out when nothing was ever fetched', async () => {
  useAuthStore.setState({ failure: 'offline' });
  await render(<SyncStatus />);
  expect(screen.getByText(t('syncStatusOffline'))).toBeTruthy();
  expect(screen.queryByText(/Updated/)).toBeNull();
});

it.each([
  ['badCredential', 'syncStatusBadCredential'],
  ['untrustedDevice', 'syncStatusUntrustedDevice'],
  ['failed', 'syncStatusLoginFailed'],
] as const)(
  'says why a %s login needs the user and offers to log in again',
  async (failure, key) => {
    useAuthStore.setState({ failure });
    await render(<SyncStatus />);
    expect(screen.getByText(t(key))).toBeTruthy();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByTestId('sync-status-relogin'));
    expect(useAuthStore.getState().reloginRequested).toBe(true);
  },
);

it('says a server error, without the button: it retries by itself', async () => {
  useAuthStore.setState({ failure: 'serverError' });
  await render(<SyncStatus />);
  expect(screen.getByText(t('syncStatusServerError'))).toBeTruthy();
  expect(screen.queryByTestId('sync-status-relogin')).toBeNull();
});

it('says it is reconnecting while a login runs, without the button', async () => {
  useAuthStore.setState({ failure: 'failed', loggingIn: true });
  await render(<SyncStatus />);
  expect(screen.getByText(t('syncStatusReconnecting'))).toBeTruthy();
  expect(screen.queryByTestId('sync-status-relogin')).toBeNull();
});

describe('as a Form section', () => {
  it('stays hidden with a session', async () => {
    useAuthStore.setState({ loggedIn: true });
    fetchedAt(now);
    await render(<SyncStatusSection />);
    expect(screen.queryByTestId('sync-status')).toBeNull();
  });

  it('shows the status with the age under it', async () => {
    useAuthStore.setState({ failure: 'offline' });
    fetchedAt(now - 5 * 60 * 1000);
    await render(<SyncStatusSection />);
    expect(screen.getByText(t('syncStatusOffline'))).toBeTruthy();
    expect(
      screen.getByText(t('syncStatusUpdated', { time: '5 minutes ago' })),
    ).toBeTruthy();
    expect(screen.queryByText(t('syncStatusLogIn'))).toBeNull();
  });

  it('offers to log in again after a refused login', async () => {
    useAuthStore.setState({ failure: 'badCredential' });
    await render(<SyncStatusSection />);
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByText(t('syncStatusLogIn')));
    expect(useAuthStore.getState().reloginRequested).toBe(true);
  });
});
