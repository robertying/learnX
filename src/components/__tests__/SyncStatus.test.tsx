import { act, render, screen, userEvent } from '@testing-library/react-native';
import SyncStatus, { SyncStatusSection } from 'components/SyncStatus';
import { initialAuth, useAuthStore } from 'data/auth';
import { t } from 'helpers/i18n';

const now = Date.parse('2026-11-10T08:00:00Z');

beforeEach(() => {
  jest.useFakeTimers({ now });
});

afterEach(() => {
  jest.useRealTimers();
  useAuthStore.setState(initialAuth);
});

it('stays hidden while logged in or before a login has failed', async () => {
  await render(<SyncStatus updatedAt={now} />);
  expect(screen.queryByTestId('sync-status')).toBeNull();
  await act(() => useAuthStore.setState({ loggedIn: true }));
  expect(screen.queryByTestId('sync-status')).toBeNull();
});

it('says it is offline and how old the data is', async () => {
  useAuthStore.setState({ failure: 'offline' });
  await render(<SyncStatus updatedAt={now - 5 * 60 * 1000} />);
  expect(
    screen.getByText(
      `${t('syncStatusOffline')} · ${t('syncStatusUpdated', { time: '5 minutes ago' })}`,
    ),
  ).toBeTruthy();
  expect(screen.queryByTestId('sync-status-relogin')).toBeNull();
});

it('leaves the age out when the list was never fetched', async () => {
  useAuthStore.setState({ failure: 'offline' });
  await render(<SyncStatus updatedAt={0} />);
  expect(screen.getByText(t('syncStatusOffline'))).toBeTruthy();
});

it('offers to log in again after a rejected login', async () => {
  useAuthStore.setState({ failure: 'rejected' });
  await render(<SyncStatus />);
  expect(screen.getByText(t('syncStatusLoginFailed'))).toBeTruthy();
  await userEvent
    .setup({ advanceTimers: jest.advanceTimersByTime })
    .press(screen.getByTestId('sync-status-relogin'));
  expect(useAuthStore.getState().reloginRequested).toBe(true);
});

it('says it is reconnecting while a login runs, without the button', async () => {
  useAuthStore.setState({ failure: 'rejected', loggingIn: true });
  await render(<SyncStatus />);
  expect(screen.getByText(t('syncStatusReconnecting'))).toBeTruthy();
  expect(screen.queryByTestId('sync-status-relogin')).toBeNull();
});

describe('as a Form section', () => {
  it('stays hidden with a session', async () => {
    useAuthStore.setState({ loggedIn: true });
    await render(<SyncStatusSection updatedAt={now} />);
    expect(screen.queryByTestId('sync-status')).toBeNull();
  });

  it('shows the status with the age under it', async () => {
    useAuthStore.setState({ failure: 'offline' });
    await render(<SyncStatusSection updatedAt={now - 5 * 60 * 1000} />);
    expect(screen.getByText(t('syncStatusOffline'))).toBeTruthy();
    expect(
      screen.getByText(t('syncStatusUpdated', { time: '5 minutes ago' })),
    ).toBeTruthy();
    expect(screen.queryByText(t('syncStatusLogInAgain'))).toBeNull();
  });

  it('offers to log in again after a rejected login', async () => {
    useAuthStore.setState({ failure: 'rejected' });
    await render(<SyncStatusSection />);
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByText(t('syncStatusLogInAgain')));
    expect(useAuthStore.getState().reloginRequested).toBe(true);
  });
});
