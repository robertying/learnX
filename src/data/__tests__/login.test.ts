import { FailReason } from '@robertying/thu-learn-lib';
import { getAuth, initialAuth, requestRelogin, useAuthStore } from 'data/auth';
import {
  getCredentials,
  saveCredentials,
  useCredentialsStore,
} from 'data/credentials';
import { getDataOwner, setDataOwner } from 'data/dataOwner';
import {
  login,
  loginWithMockAccount,
  loginWithOfflineMode,
  logout,
} from 'data/login';
import { mockUserData } from 'data/mock';
import { getUserData, resetUserData, setArchived } from 'data/userData';
// The fixture helpers/env is mocked with (jest/setup.ts), typed as strings.
import env from '../../../jest/mocks/env';
import { MOCK_FINGER_PRINT } from 'helpers/mock';
import {
  clearLoginCookies,
  dataSource,
  loginWithFingerPrint,
  resetDataSource,
} from 'data/source';
import { queryClient } from 'data/queryClient';
import { userQuery } from 'data/queries';

jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
  loginWithFingerPrint: jest.fn(async () => {}),
  resetDataSource: jest.fn(),
  clearLoginCookies: jest.fn(async () => {}),
}));
// One attempt, without the backoff.
jest.mock('helpers/surfaces', () => ({
  clearSurfaces: jest.fn(async () => {}),
}));
jest.mock('helpers/files/downloads', () => ({
  removeFileDir: jest.fn(async () => {}),
}));
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
  useCredentialsStore.setState({ credentials: null });
  setDataOwner(null);
  resetUserData();
  queryClient.clear();
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
      failure: null,
      reloginRequested: false,
    });
  });

  it('fails a login SSO captured without its fingerprint, keeping the saved one', async () => {
    useCredentialsStore.setState({
      credentials: { ...sso, username: 'saved' },
    });
    await login({ ...sso, fingerPrint: '' });
    expect(loginWithFingerPrint).not.toHaveBeenCalled();
    expect(getAuth()).toMatchObject({
      loggingIn: false,
      loggedIn: false,
      error: FailReason.NO_CREDENTIAL,
      failure: 'rejected',
    });
    expect(getCredentials()?.username).toBe('saved');
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
    expect(loginWithFingerPrint).toHaveBeenCalledWith(sso);
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
    expect(getAuth()).toMatchObject({
      loggedIn: false,
      error: FailReason.BAD_CREDENTIAL,
      failure: 'rejected',
    });
  });

  it('records a login that got no answer as offline', async () => {
    jest.mocked(loginWithFingerPrint).mockRejectedValueOnce({
      reason: FailReason.NETWORK_ERROR,
      extra: new TypeError('Network request failed'),
    });
    await login({ reset: true });
    expect(getAuth()).toMatchObject({
      loggedIn: false,
      error: FailReason.NETWORK_ERROR,
      failure: 'offline',
    });
  });

  it('records a timed-out login as offline', async () => {
    jest
      .mocked(loginWithFingerPrint)
      .mockRejectedValueOnce({ reason: FailReason.REQUEST_TIMEOUT });
    await login({ reset: true });
    expect(getAuth()).toMatchObject({ failure: 'offline' });
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
    const order: string[] = [];
    jest.spyOn(dataSource, 'logout').mockImplementationOnce(async () => {
      order.push('server logout');
    });
    jest.mocked(clearLoginCookies).mockImplementationOnce(async () => {
      order.push('cookies');
    });
    await logout();
    expect(order).toEqual(['server logout', 'cookies']);
    expect(getAuth()).toEqual(initialAuth);
    expect(getCredentials()).toBeNull();
  });
});

describe('switching accounts', () => {
  const cachedKey = ['courses', 'semester'];

  /** Data the previous account left behind. */
  const leaveData = () => {
    setArchived('notice', ['old-notice'], true);
    queryClient.setQueryData(cachedKey, ['old-course']);
  };

  const dataKept = () =>
    getUserData().archived.notice.includes('old-notice') &&
    queryClient.getQueryData(cachedKey) !== undefined;

  it('drops the ephemeral mock account’s data on a real login after a relaunch', async () => {
    loginWithMockAccount(env.DUMMY_USERNAME);
    await saveCredentials({
      username: env.DUMMY_USERNAME,
      password: env.DUMMY_PASSWORD,
      fingerPrint: MOCK_FINGER_PRINT,
      fingerGenPrint: '',
      fingerGenPrint3: '',
    });
    expect(getUserData()).toEqual(mockUserData);
    leaveData();
    // A relaunch forgets the ephemeral login but keeps its data.
    useAuthStore.setState(initialAuth);
    useCredentialsStore.setState({ credentials: null });

    await login(sso);

    expect(getAuth().loggedIn).toBe(true);
    expect(dataKept()).toBe(false);
    expect(getUserData().archived.notice).toEqual([]);
    expect(getUserData().currentSemester).toBeNull();
    expect(getDataOwner()).toBe('student');
  });

  it('drops the data when "Log in again" signs in as someone else', async () => {
    await login(sso);
    leaveData();
    useAuthStore.setState({ loggedIn: false, failure: 'rejected' });
    requestRelogin();

    await login({ ...sso, username: 'someone-else' });

    expect(dataKept()).toBe(false);
    expect(getDataOwner()).toBe('someone-else');
    expect(getCredentials()?.username).toBe('someone-else');
  });

  it('keeps the data when the same user logs in again', async () => {
    await login(sso);
    leaveData();
    useAuthStore.setState({ loggedIn: false, failure: 'rejected' });
    requestRelogin();

    await login(sso);
    expect(dataKept()).toBe(true);

    // A relaunch or a resume signs in with the saved login.
    await login({ reset: true });
    await login({ resume: true });
    expect(dataKept()).toBe(true);
    expect(getDataOwner()).toBe('student');
  });

  it('keeps the persistent mock account’s data when it logs in', async () => {
    loginWithMockAccount(env.DUMMY_PERSIST_USERNAME);
    leaveData();
    await login({
      username: env.DUMMY_PERSIST_USERNAME,
      password: env.DUMMY_PERSIST_PASSWORD,
      fingerPrint: MOCK_FINGER_PRINT,
    });
    expect(dataKept()).toBe(true);
    expect(getDataOwner()).toBe(env.DUMMY_PERSIST_USERNAME);
  });

  it('takes data saved before its owner was recorded as the saved login’s', async () => {
    await saveCredentials(sso);
    leaveData();
    await login({ reset: true });
    expect(dataKept()).toBe(true);
    expect(getDataOwner()).toBe('student');
  });

  it('keeps the data when a login as someone else fails', async () => {
    await login(sso);
    leaveData();
    jest
      .mocked(loginWithFingerPrint)
      .mockRejectedValueOnce({ reason: FailReason.BAD_CREDENTIAL });
    await login({ ...sso, username: 'someone-else' });
    expect(dataKept()).toBe(true);
    expect(getDataOwner()).toBe('student');
  });

  it('forgets the owner on logout', async () => {
    await login(sso);
    await logout();
    expect(getDataOwner()).toBeNull();
  });

  it('deletes the downloaded files on logout', async () => {
    const { removeFileDir } = require('helpers/files/downloads');
    removeFileDir.mockClear();
    await login(sso);
    await logout();
    expect(removeFileDir).toHaveBeenCalled();
  });
});
