import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initialAuth, cancelRelogin, useAuthStore } from 'data/auth';
import {
  dataSource,
  isServerReachable,
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
import { resetSettings } from 'data/settings';
import { resetUserData, UserData } from 'data/userData';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { userQuery } from 'data/queries';
import { isBadCredential, isNetworkError, serializeError } from 'helpers/parse';
import { retry } from 'helpers/retry';
import { updateDeadlineWidget, updateUpNextWidget } from 'widgets';
import { clearSpotlight } from 'helpers/spotlight';
import { resetNotified } from 'data/notified';
import { resetSyncLog } from 'data/syncLog';
import { clearSubmissionDrafts } from 'data/submissionDrafts';
import { cancelDeadlineReminders } from 'helpers/deadlineReminders';

/**
 * Forgets everything kept for the account whose data this is: the server
 * data, the user's own data, settings, submission drafts and what the widgets,
 * Spotlight and reminders show. The login itself is left alone.
 */
function clearAccountData(userData?: UserData) {
  resetSettings();
  resetUserData(userData);
  resetNotified();
  resetSyncLog();
  clearSubmissionDrafts();
  clearQueryCache();
  setDataOwner(null);
  updateDeadlineWidget([], { hiddenCourses: [], archived: [] });
  updateUpNextWidget();
  clearSpotlight();
  return cancelDeadlineReminders().catch(() => {});
}

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
 * Signs in with the given login, or the saved one when none is given. A login
 * with a fingerprint (from SSO) is saved; a username and password alone first
 * forget the saved one. With `resume`, it keeps the current session when the
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
  if (!username || !password || !fingerPrint) {
    if (getAuth().loggingIn) {
      return;
    }
  }

  useAuthStore.setState({ loggingIn: true, error: null });
  // Before the saved login is replaced: data saved before owners were
  // recorded belongs to the saved login.
  const previousOwner = getDataOwner() ?? getCredentials()?.username ?? null;
  if (username && password && !fingerPrint) {
    await clearCredentials().catch(() => undefined);
  }

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
              username,
              password,
              fingerPrint,
              fingerGenPrint,
              fingerGenPrint3,
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
    // A wrong password is BAD_CREDENTIAL. Otherwise (ERROR_FETCH_FROM_ID: the
    // SSO server failed or couldn't be reached), a failed fetch in the last
    // attempt means offline; if the server answers now, it turned the login
    // down.
    const offline =
      !isBadCredential(err) &&
      (isNetworkError(err) || !(await isServerReachable()));
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
 * Logs out: forgets the login, the server data and the user's own data,
 * submission drafts included.
 */
export async function logout() {
  useAuthStore.setState(initialAuth);
  await Promise.all([
    clearAccountData(),
    clearCredentials(),
    // Only left behind if the one-time import failed; they must not come
    // back after logging out.
    AsyncStorage.multiRemove([LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY]),
  ]);
}
