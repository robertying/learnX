import { FailReason } from '@robertying/thu-learn-lib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initialAuth, cancelRelogin, useAuthStore } from 'data/auth';
import {
  clearLoginCookies,
  dataSource,
  loginWithFingerPrint,
  resetDataSource,
} from 'data/source';
import {
  clearCredentials,
  Credentials,
  getCredentials,
  saveCredentials,
} from 'data/credentials';
import { getDataOwner, setDataOwner } from 'data/dataOwner';
import { LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY } from 'data/legacy';
import { flushServerActionsWithin } from 'data/serverActions';
import { queryClient } from 'data/queryClient';
import { clearAccountData } from 'data/accountData';
import { userQuery } from 'data/queries';
import { isBadCredential, isNetworkError, serializeError } from 'helpers/parse';
import { retry } from 'helpers/retry';

/**
 * Makes the saved data `username`'s: when it belonged to someone else, or to
 * nobody known, it is dropped first, so a new account never starts with the
 * previous one's courses, lists or timetable.
 */
function claimData(previousOwner: string | null, username: string) {
  if (previousOwner !== username) {
    void clearAccountData();
  }
  setDataOwner(username);
}

const loggedIn = () =>
  useAuthStore.setState({
    loggingIn: false,
    loggedIn: true,
    error: null,
    failure: null,
    reloginRequested: false,
  });

/**
 * Signs in with the given login, or the saved one when none is given. A given
 * login needs the fingerprint SSO captured, and is saved once it works; one
 * without it fails without touching the saved login. With `resume`, it keeps the current session when the
 * server still accepts it (one request) and only signs in again when it has
 * expired, as when the app comes back from the background.
 */
export async function login({
  username,
  password,
  fingerPrint,
  fingerGenPrint = '',
  fingerGenPrint3 = '',
  reset = false,
  resume = false,
}: Partial<Credentials> & { reset?: boolean; resume?: boolean }) {
  if (username && (!password || !fingerPrint)) {
    // SSO didn't capture the login: signing in with the saved one instead
    // would log in as someone else, so this login just fails.
    useAuthStore.setState({
      loggingIn: false,
      loggedIn: false,
      error: FailReason.NO_CREDENTIAL,
      failure: 'rejected',
    });
    return;
  }
  if (!username && getAuth().loggingIn) {
    return;
  }

  useAuthStore.setState({ loggingIn: true, error: null });
  // Before the saved login is replaced: data saved before owners were
  // recorded belongs to the saved login.
  const previousOwner = getDataOwner() ?? getCredentials()?.username ?? null;

  try {
    if (reset) {
      resetDataSource();
    }

    // Without a connection, another try right away won't help (and a timeout
    // takes long); the offline retries in useReLogin take over instead.
    await retry(
      () =>
        resume
          ? dataSource.ensureSession()
          : loginWithFingerPrint(
              // An incomplete login signs in with the saved one.
              username && password && fingerPrint
                ? {
                    username,
                    password,
                    fingerPrint,
                    fingerGenPrint,
                    fingerGenPrint3,
                  }
                : undefined,
            ),
      3,
      1000,
      // a wrong password won't become right, and repeated tries may lock the account
      error => !isNetworkError(error) && !isBadCredential(error),
    );

    if (username && password && fingerPrint) {
      // A failed write keeps the login for this session only.
      await saveCredentials({
        username,
        password,
        fingerPrint,
        fingerGenPrint,
        fingerGenPrint3,
      }).catch(() => undefined);
    }
    const account = username ?? getCredentials()?.username;
    if (account) {
      claimData(previousOwner, account);
    }
    loggedIn();
    void queryClient.prefetchQuery(userQuery);
  } catch (err) {
    // Offline when the last attempt got no answer; anything else (a wrong
    // password, or the server failing the login) is the server turning it
    // down.
    const offline = isNetworkError(err);
    useAuthStore.setState({
      loggingIn: false,
      loggedIn: false,
      error: serializeError(err).reason,
      failure: offline ? 'offline' : 'rejected',
    });
  }
}

/**
 * Leaves the login screen for the saved data, without a session. Lists show
 * what was cached; refreshing them logs in again.
 */
export const loginWithOfflineMode = cancelRelogin;

/** Loads the mock account's data, replacing whatever was there. */
export function loginWithMockAccount(username: string) {
  const { mockUserData } = require('data/mock') as typeof import('data/mock');
  void clearAccountData(mockUserData);
  setDataOwner(username);
  loggedIn();
}

/**
 * Logs out: sends what's waiting, ends the session on the server, and forgets
 * the login, the server data and the user's own data, submission drafts
 * included.
 */
export async function logout() {
  // Favorites not sent yet are lost with the rest; give them one quick try
  // while the session is still open.
  await flushServerActionsWithin(3_000);
  useAuthStore.setState(initialAuth);
  // Not waited for: the account's data goes whether or not the server hears.
  dataSource.logout().catch(() => {});
  await Promise.all([
    clearLoginCookies().catch(() => {}),
    clearAccountData(),
    clearCredentials(),
    // Only left behind if the one-time import failed; they must not come
    // back after logging out.
    AsyncStorage.multiRemove([LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY]),
  ]);
}
