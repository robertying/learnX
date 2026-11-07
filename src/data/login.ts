import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initialAuth, useAuthStore } from 'data/auth';
import { loginWithFingerPrint, resetDataSource } from 'data/source';
import {
  clearCredentials,
  Credentials,
  saveCredentials,
} from 'data/credentials';
import { LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY } from 'data/legacy';
import { resetSettings } from 'data/settings';
import { resetUserData } from 'data/userData';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { userQuery } from 'data/queries';
import { serializeError } from 'helpers/parse';
import { retry } from 'helpers/retry';

const loggedIn = () =>
  useAuthStore.setState({ loggingIn: false, loggedIn: true, error: null });

/**
 * Signs in with the given login, or the saved one when none is given. A login
 * with a fingerprint (from SSO) is saved; a username and password alone first
 * forget the saved one.
 */
export async function login({
  username,
  password,
  fingerPrint,
  fingerGenPrint = '',
  fingerGenPrint3 = '',
  reset = false,
}: Partial<Credentials> & { reset?: boolean }) {
  if (!username || !password || !fingerPrint) {
    if (getAuth().loggingIn) {
      return;
    }
  }

  useAuthStore.setState({ loggingIn: true, error: null });
  if (username && password && !fingerPrint) {
    await clearCredentials().catch(() => undefined);
  }

  try {
    if (reset) {
      resetDataSource();
    }

    await retry(async () => {
      await loginWithFingerPrint(
        username,
        password,
        fingerPrint,
        fingerGenPrint,
        fingerGenPrint3,
      );
    });

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
    loggedIn();
    queryClient.prefetchQuery(userQuery);
  } catch (err) {
    useAuthStore.setState({
      loggingIn: false,
      loggedIn: false,
      error: serializeError(err).reason,
    });
  }
}

/** Shows the cached data without signing in. */
export const loginWithOfflineMode = loggedIn;

/** Loads the mock account's data, replacing whatever was there. */
export function loginWithMockAccount() {
  const { mockUserData } = require('data/mock') as typeof import('data/mock');
  resetSettings();
  resetUserData(mockUserData);
  clearQueryCache();
  loggedIn();
}

/** Logs out: forgets the login, the server data and the user's own data. */
export async function logout() {
  useAuthStore.setState(initialAuth);
  resetSettings();
  resetUserData();
  clearQueryCache();
  await Promise.all([
    clearCredentials(),
    // Only left behind if the one-time import failed; they must not come
    // back after logging out.
    AsyncStorage.multiRemove([LEGACY_ROOT_KEY, LEGACY_SETTINGS_KEY]),
  ]);
}
