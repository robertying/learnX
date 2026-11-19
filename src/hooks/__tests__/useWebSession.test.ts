import { act, renderHook } from '@testing-library/react-native';
import { initialAuth, noteSession, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';
import { syncWebViewCookies } from 'helpers/webViewCookies';
import useWebSession, { LOGIN_WAIT_MS } from 'hooks/useWebSession';

jest.mock('helpers/webViewCookies', () => ({
  syncWebViewCookies: jest.fn(async () => ''),
}));

const savedLogin = {
  username: 'student',
  password: 'p',
  fingerPrint: 'fp',
  fingerGenPrint: '',
  fingerGenPrint3: '',
};

const renderSession = async (needed = true) => {
  const hook = await renderHook(() => useWebSession(needed));
  // Lets the cookie copy finish.
  await act(async () => {});
  return hook;
};

beforeEach(() => {
  useCredentialsStore.setState({ credentials: savedLogin });
  useAuthStore.setState(initialAuth);
});
afterEach(() => {
  useCredentialsStore.setState({ credentials: null });
  useAuthStore.setState(initialAuth);
  jest.useRealTimers();
});

it('waits at launch, before the launch login has started, and loads once it is through', async () => {
  const { result } = await renderSession();
  expect(result.current).toBeNull();
  expect(syncWebViewCookies).not.toHaveBeenCalled();

  await act(async () => useAuthStore.setState({ loggingIn: true }));
  await act(async () => noteSession('new'));
  expect(result.current).toBeNull();

  await act(async () =>
    useAuthStore.setState({ loggingIn: false, loggedIn: true }),
  );
  await act(async () => {});
  expect(syncWebViewCookies).toHaveBeenCalledTimes(1);
  expect(result.current).toBe('new');
});

it('loads again with the new cookies after a login it did not wait for', async () => {
  useAuthStore.setState({ loggedIn: true, sessionToken: 'old' });
  const { result } = await renderSession();
  expect(result.current).toBe('old');

  // The session had expired, and thu-learn-lib logged in again.
  let finish!: (cookies: string) => void;
  jest
    .mocked(syncWebViewCookies)
    .mockReturnValueOnce(new Promise(resolve => (finish = resolve)));
  await act(async () => noteSession('new'));
  // Not before the new cookies are in the web views' store.
  expect(result.current).toBe('old');
  await act(async () => finish(''));
  expect(result.current).toBe('new');
});

it('waits for a login after a break, which keeps the token when the session is still good', async () => {
  useAuthStore.setState({
    loggedIn: true,
    loggingIn: true,
    sessionToken: 'token',
  });
  const { result } = await renderSession();
  expect(result.current).toBeNull();
  await act(async () => useAuthStore.setState({ loggingIn: false }));
  await act(async () => {});
  expect(result.current).toBe('token');
});

it('shows the content anyway when the login takes too long', async () => {
  jest.useFakeTimers();
  useAuthStore.setState({ loggingIn: true });
  const { result } = await renderSession();
  expect(result.current).toBeNull();
  await act(async () => jest.advanceTimersByTime(LOGIN_WAIT_MS));
  await act(async () => {});
  expect(result.current).toBe('');

  // And loads again once it's through.
  await act(async () => {
    noteSession('new');
    useAuthStore.setState({ loggingIn: false, loggedIn: true });
  });
  await act(async () => {});
  expect(result.current).toBe('new');
});

it("doesn't wait when there's no login to wait for", async () => {
  useCredentialsStore.setState({ credentials: null });
  expect((await renderSession()).result.current).toBe('');

  useCredentialsStore.setState({ credentials: savedLogin });
  useAuthStore.setState({ failure: 'offline' });
  expect((await renderSession()).result.current).toBe('');

  useAuthStore.setState({ failure: null, reloginRequested: true });
  expect((await renderSession()).result.current).toBe('');
});

it("never waits for content that doesn't load from Web Learning", async () => {
  useAuthStore.setState({ loggingIn: true, sessionToken: 'token' });
  const { result } = await renderSession(false);
  expect(result.current).toBe('token');
  expect(syncWebViewCookies).not.toHaveBeenCalled();
  // Nor does it load again after a login.
  await act(async () => noteSession('new'));
  expect(result.current).toBe('token');
});
