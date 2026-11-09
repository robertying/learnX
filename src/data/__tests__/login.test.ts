import { FailReason } from '@robertying/thu-learn-lib';
import { getAuth, initialAuth, useAuthStore } from 'data/auth';
import { getCredentials } from 'data/credentials';
import { login, loginWithOfflineMode, logout } from 'data/login';
import {
  dataSource,
  isServerReachable,
  loginWithFingerPrint,
  resetDataSource,
} from 'data/source';
import { queryClient } from 'data/queryClient';
import { userQuery } from 'data/queries';

jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
  loginWithFingerPrint: jest.fn(async () => {}),
  resetDataSource: jest.fn(),
  isServerReachable: jest.fn(async () => true),
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
  jest.mocked(isServerReachable).mockClear();
});

describe('login', () => {
  it('starts logged out', () => {
    expect(getAuth()).toEqual({
      loggingIn: false,
      ssoInProgress: false,
      loggedIn: false,
      error: null,
      failure: null,
      reloginRequested: false,
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

  it('records a failed login the server answered as rejected', async () => {
    jest
      .mocked(loginWithFingerPrint)
      .mockRejectedValueOnce({ reason: FailReason.ERROR_FETCH_FROM_ID });
    await login(sso);
    expect(getAuth()).toMatchObject({
      loggingIn: false,
      loggedIn: false,
      error: FailReason.ERROR_FETCH_FROM_ID,
      failure: 'rejected',
    });
  });

  it('records a wrong password as rejected at once, without retrying', async () => {
    jest
      .mocked(loginWithFingerPrint)
      .mockRejectedValueOnce({ reason: FailReason.BAD_CREDENTIAL });
    await login(sso);
    expect(loginWithFingerPrint).toHaveBeenCalledTimes(1);
    expect(isServerReachable).not.toHaveBeenCalled();
    expect(getAuth()).toMatchObject({
      loggedIn: false,
      error: FailReason.BAD_CREDENTIAL,
      failure: 'rejected',
    });
  });

  it('records a failed fetch as offline, even if the network is back', async () => {
    jest.mocked(loginWithFingerPrint).mockRejectedValueOnce({
      reason: FailReason.ERROR_FETCH_FROM_ID,
      extra: new TypeError('Network request failed'),
    });
    await login({ reset: true });
    expect(getAuth()).toMatchObject({ failure: 'offline' });
    expect(isServerReachable).not.toHaveBeenCalled();
  });

  it('records a failed login as offline when the server is unreachable', async () => {
    jest
      .mocked(loginWithFingerPrint)
      .mockRejectedValueOnce({ reason: FailReason.ERROR_FETCH_FROM_ID });
    jest.mocked(isServerReachable).mockResolvedValueOnce(false);
    await login({ reset: true });
    expect(getAuth()).toMatchObject({
      loggedIn: false,
      error: FailReason.ERROR_FETCH_FROM_ID,
      failure: 'offline',
    });
  });

  it('clears the failure and the login screen once a login works', async () => {
    useAuthStore.setState({
      failure: 'rejected',
      error: FailReason.ERROR_FETCH_FROM_ID,
      reloginRequested: true,
    });
    await login(sso);
    expect(getAuth()).toMatchObject({
      loggedIn: true,
      error: null,
      failure: null,
      reloginRequested: false,
    });
  });

  it('resets the session when asked', async () => {
    await login({ reset: true });
    expect(resetDataSource).toHaveBeenCalled();
  });

  it('keeps a session the server still accepts when resuming', async () => {
    const ensureSession = jest.spyOn(dataSource, 'ensureSession');
    await login({ resume: true });
    expect(ensureSession).toHaveBeenCalled();
    expect(loginWithFingerPrint).not.toHaveBeenCalled();
    expect(resetDataSource).not.toHaveBeenCalled();
    expect(getAuth()).toMatchObject({ loggedIn: true, failure: null });
  });

  it('records a failed resume like a failed login', async () => {
    jest
      .spyOn(dataSource, 'ensureSession')
      .mockRejectedValueOnce({ reason: FailReason.BAD_CREDENTIAL });
    await login({ resume: true });
    expect(getAuth()).toMatchObject({ loggedIn: false, failure: 'rejected' });
  });

  it('does not start a second login with the saved one', async () => {
    useAuthStore.setState({ loggingIn: true });
    await login({ reset: true });
    expect(loginWithFingerPrint).not.toHaveBeenCalled();
  });

  it('goes back from the login screen to the cached data', () => {
    useAuthStore.setState({ reloginRequested: true, failure: 'rejected' });
    loginWithOfflineMode();
    expect(getAuth()).toMatchObject({
      reloginRequested: false,
      loggedIn: false,
    });
  });

  it('logs out and forgets the login', async () => {
    await login(sso);
    await logout();
    expect(getAuth()).toEqual(initialAuth);
    expect(getCredentials()).toBeNull();
  });
});
