import { FailReason } from 'thu-learn-lib';
import { getAuth, initialAuth, useAuthStore } from 'data/auth';
import { getCredentials } from 'data/credentials';
import { login, loginWithOfflineMode, logout } from 'data/login';
import { loginWithFingerPrint, resetDataSource } from 'data/source';
import { queryClient } from 'data/queryClient';
import { userQuery } from 'data/queries';

jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
  loginWithFingerPrint: jest.fn(async () => {}),
  resetDataSource: jest.fn(),
}));
// One attempt, without the backoff.
jest.mock('helpers/retry', () => ({
  retry: (fn: () => Promise<unknown>) => fn(),
}));

const sso = {
  username: 'student',
  password: 'secret',
  fingerPrint: 'fp',
  fingerGenPrint: 'g',
  fingerGenPrint3: 'g3',
};

beforeEach(() => {
  useAuthStore.setState(initialAuth);
  // The user's name is fetched after a login; it isn't what's tested here.
  jest.spyOn(queryClient, 'prefetchQuery').mockResolvedValue();
  jest.mocked(loginWithFingerPrint).mockClear();
  jest.mocked(resetDataSource).mockClear();
});

describe('login', () => {
  it('starts logged out', () => {
    expect(getAuth()).toEqual({
      loggingIn: false,
      ssoInProgress: false,
      loggedIn: false,
      error: null,
    });
  });

  it('marks the login in progress, then done, and saves an SSO login', async () => {
    useAuthStore.setState({ error: FailReason.BAD_CREDENTIAL });
    const done = login(sso);
    expect(getAuth()).toMatchObject({ loggingIn: true, error: null });
    await done;

    expect(getAuth()).toMatchObject({
      loggingIn: false,
      loggedIn: true,
      error: null,
    });
    expect(loginWithFingerPrint).toHaveBeenCalledWith(
      'student',
      'secret',
      'fp',
      'g',
      'g3',
    );
    expect(getCredentials()).toEqual(sso);
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(userQuery);
  });

  it('records the reason of a failed login', async () => {
    jest
      .mocked(loginWithFingerPrint)
      .mockRejectedValueOnce({ reason: FailReason.BAD_CREDENTIAL });
    await login(sso);
    expect(getAuth()).toMatchObject({
      loggingIn: false,
      loggedIn: false,
      error: FailReason.BAD_CREDENTIAL,
    });
  });

  it('resets the session when asked', async () => {
    await login({ reset: true });
    expect(resetDataSource).toHaveBeenCalled();
  });

  it('does not start a second login with the saved one', async () => {
    useAuthStore.setState({ loggingIn: true });
    await login({ reset: true });
    expect(loginWithFingerPrint).not.toHaveBeenCalled();
  });

  it('can show the cached data offline', () => {
    useAuthStore.setState({ error: FailReason.NOT_LOGGED_IN });
    loginWithOfflineMode();
    expect(getAuth()).toMatchObject({ loggedIn: true, error: null });
  });

  it('logs out and forgets the login', async () => {
    await login(sso);
    await logout();
    expect(getAuth()).toEqual(initialAuth);
    expect(getCredentials()).toBeNull();
  });
});
