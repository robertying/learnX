import { ApiError, FailReason } from '@robertying/thu-learn-lib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initialAuth, cancelRelogin, useAuthStore } from 'data/auth';
import {
  clearSessionCookies,
  dataSource,
  endSession,
  loginWithFingerPrint,
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
import type { UserData } from 'data/userData';
import { errorReason, loginFailureOf } from 'helpers/errors';
import env from 'helpers/env';
import { isMockUser } from 'helpers/mock';
import { retry } from 'helpers/retry';
import { waitAtMost } from 'helpers/waitAtMost';

/**
 * Makes the saved data `username`'s: when it belonged to someone else, or to
 * nobody known, it is dropped first, so a new account never starts with the
 * previous one's courses, lists or timetable. With `startOver`, it's dropped
 * either way and the user data starts from it (the mock account typed on the
 * login screen starts from its sample data). The stores, the server cache
 * and the files go at once. What the system shows for the old data (widgets,
 * Spotlight, reminders) is cleared in the surfaces' own queue, ahead of
 * anything shown for this account, so the login doesn't wait for it: the
 * system can take minutes to answer, as Spotlight does after a restart.
 */
function claimData(
  previousOwner: string | null,
  username: string,
  startOver?: UserData,
) {
  if (startOver || previousOwner !== username) {
    void clearAccountData(startOver);
  }
  setDataOwner(username);
}

/** The mock account's sample user data, loaded only when it's used. */
const mockUserData = () =>
  (require('data/mock') as typeof import('data/mock')).mockUserData;

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
 * without it fails without touching the saved login. A given mock login drops
 * the saved data and starts over from the mock account's. With `resume`, it
 * keeps the current session when the server still accepts it (one request)
 * and only signs in again when it has expired, as when the app comes back
 * from the background. The main UI shows only once the login is saved and its
 * data is ready, so no list is fetched for the previous account meanwhile.
 */
export async function login({
  username,
  password,
  fingerPrint,
  fingerGenPrint = '',
  fingerGenPrint3 = '',
  resume = false,
}: Partial<Credentials> & { resume?: boolean }) {
  const given: Credentials | undefined =
    username && password && fingerPrint
      ? { username, password, fingerPrint, fingerGenPrint, fingerGenPrint3 }
      : undefined;
  if (username && !given) {
    // SSO didn't capture the login: signing in with the saved one instead
    // would log in as someone else, so this login just fails.
    useAuthStore.setState({
      loggingIn: false,
      loggedIn: false,
      error: FailReason.NO_CREDENTIAL,
      failure: 'failed',
    });
    return;
  }
  if (!username && getAuth().loggingIn) {
    return;
  }

  useAuthStore.setState({ loggingIn: true, error: null, errorDetail: null });
  // Before the saved login is replaced: data saved before owners were
  // recorded belongs to the saved login.
  const previousOwner = getDataOwner() ?? getCredentials()?.username ?? null;

  try {
    // Only a server error is tried again right away. Without a connection,
    // another try won't help (and a timeout takes long): the timed retries in
    // useReLogin take over. A refused login would only be refused again, and
    // more wrong passwords may lock the account.
    await retry(
      () =>
        resume
          ? dataSource.ensureSession()
          : // Without a given login, signs in with the saved one.
            loginWithFingerPrint(given),
      {
        shouldRetry: error => loginFailureOf(error) === 'serverError',
      },
    );

    if (given) {
      // Saved for this session at once; the keychain write isn't waited for,
      // and a failed one keeps the login for this session only.
      void saveCredentials(given).catch(() => undefined);
    }
    const account = username ?? getCredentials()?.username;
    if (account) {
      claimData(
        previousOwner,
        account,
        username && isMockUser(username) ? mockUserData() : undefined,
      );
    }
    loggedIn();
    void queryClient.prefetchQuery(userQuery);
  } catch (err) {
    useAuthStore.setState({
      loggingIn: false,
      loggedIn: false,
      error: errorReason(err),
      // What the SSO server answered (thu-learn-lib's `extra`), which the
      // login screen shows in debug and E2E builds.
      errorDetail: __DEV__ || env.TEST_LOGIN ? errorDetail(err) : null,
      failure: loginFailureOf(err),
    });
  }
}

const errorDetail = (err: unknown) => {
  const extra = (err as Partial<ApiError> | null)?.extra;
  if (extra === undefined || extra === null) {
    return null;
  }
  if (typeof extra === 'string' || extra instanceof Error) {
    return String(extra);
  }
  try {
    return JSON.stringify(extra);
  } catch {
    return null;
  }
};

/**
 * Leaves the login screen for the saved data, without a session. Lists show
 * what was cached; refreshing them logs in again.
 */
export const loginWithOfflineMode = cancelRelogin;

/** How long a logout waits for the server to end the session. */
const SERVER_LOGOUT_WAIT_MS = 3_000;

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
  // The account's data goes whether or not the server hears, but the logout
  // gets a moment to end the session before its cookies are dropped.
  const serverLogout = dataSource.logout().catch(() => {});
  endSession();
  await waitAtMost(serverLogout, SERVER_LOGOUT_WAIT_MS);
  await Promise.all([
    clearSessionCookies().catch(() => {}),
    clearAccountData(),
    clearCredentials(),
    // Only left behind if the one-time import failed; they must not come
    // back after logging out.
    AsyncStorage.multiRemove([LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY]),
  ]);
}
