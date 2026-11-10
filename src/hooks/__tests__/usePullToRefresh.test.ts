import { act, renderHook } from '@testing-library/react-native';
import { toast } from 'components/Toast';
import { initialAuth, useAuthStore } from 'data/auth';
import { login } from 'data/login';
import { t } from 'helpers/i18n';
import usePullToRefresh from 'hooks/usePullToRefresh';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
// Like the real one, it marks the login running before it resolves.
jest.mock('data/login', () => ({
  login: jest.fn(async () => {
    require('data/auth').useAuthStore.setState({ loggingIn: true });
  }),
}));

afterEach(() => {
  useAuthStore.setState(initialAuth);
});

const render = (
  refresh: () => Promise<{ isError: boolean } | void>,
  fetching = false,
) =>
  renderHook(
    ({ fetching: f }: { fetching: boolean }) => usePullToRefresh(refresh, f),
    {
      initialProps: { fetching },
    },
  );

it('refetches while logged in, saying so when it fails', async () => {
  useAuthStore.setState({ loggedIn: true });
  const refresh = jest
    .fn<Promise<{ isError: boolean }>, []>()
    .mockResolvedValueOnce({ isError: false })
    .mockResolvedValueOnce({ isError: true });
  const { result } = await render(refresh);

  await act(() => result.current.onRefresh());
  expect(toast).not.toHaveBeenCalled();
  await act(() => result.current.onRefresh());
  expect(toast).toHaveBeenCalledWith(t('refreshFailed'), 'error');
  expect(login).not.toHaveBeenCalled();
});

it('spins while the list fetches', async () => {
  const hook = await render(jest.fn(), true);
  expect(hook.result.current.refreshing).toBe(true);
  await hook.rerender({ fetching: false });
  expect(hook.result.current.refreshing).toBe(false);
});

it('logs in again without a session, spinning until the login ends', async () => {
  const refresh = jest.fn();
  const { result } = await render(refresh);

  await act(async () => {
    useAuthStore.setState({ loggingIn: true });
    await result.current.onRefresh();
  });
  // A login already running isn't started again.
  expect(login).not.toHaveBeenCalled();

  await act(() => useAuthStore.setState({ loggingIn: false }));
  await act(() => result.current.onRefresh());
  expect(login).toHaveBeenCalledWith({ reset: true });
  expect(refresh).not.toHaveBeenCalled();
  expect(result.current.refreshing).toBe(true);
  await act(() => useAuthStore.setState({ loggingIn: false }));
  expect(result.current.refreshing).toBe(false);
  // A later login the user didn't pull for shows no spinner.
  await act(() => useAuthStore.setState({ loggingIn: true }));
  expect(result.current.refreshing).toBe(false);
});
