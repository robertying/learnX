import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { isEphemeralMockUser } from 'helpers/mock';

/** What a login needs to sign in again without the user. */
export interface Credentials {
  username: string;
  password: string;
  fingerPrint: string;
  fingerGenPrint: string;
  fingerGenPrint3: string;
}

export const CREDENTIALS_KEY = 'credentials';

/**
 * Where redux-persist-expo-securestore kept the persisted `auth` slice up to
 * 18.0.3: `persist:auth` with characters outside [a-z0-9.\-_] replaced by `_`.
 */
export const LEGACY_AUTH_KEY = 'persist_auth';

const options: SecureStore.SecureStoreOptions = {
  // Lets the background refresh read them while the device is locked.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

interface CredentialsState {
  credentials: Credentials | null;
}

/**
 * The saved login. Lives in the keychain (iOS) or Keystore-backed storage
 * (Android); this store mirrors it in memory once `loadCredentials` resolves.
 */
export const useCredentialsStore = create<CredentialsState>()(() => ({
  credentials: null,
}));

export const useCredentials = () =>
  useCredentialsStore(state => state.credentials);

export const getCredentials = () => useCredentialsStore.getState().credentials;

const isCredentials = (value: unknown): value is Credentials => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const c = value as Record<string, unknown>;
  return (
    typeof c.username === 'string' &&
    !!c.username &&
    typeof c.password === 'string' &&
    !!c.password &&
    typeof c.fingerPrint === 'string' &&
    typeof c.fingerGenPrint === 'string' &&
    typeof c.fingerGenPrint3 === 'string'
  );
};

const parse = (raw: string | null): Credentials | null => {
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isCredentials(value) ? value : null;
  } catch {
    return null;
  }
};

/**
 * redux-persist stored the slice as a JSON object whose values are themselves
 * JSON strings, e.g. `{"username":"\"2020011234\"","fingerGenPrint":"null"}`.
 */
export const parseLegacyAuth = (raw: string | null): Credentials | null => {
  if (!raw) {
    return null;
  }
  try {
    const outer: unknown = JSON.parse(raw);
    if (!outer || typeof outer !== 'object') {
      return null;
    }
    const field = (key: string) => {
      const value = (outer as Record<string, unknown>)[key];
      if (typeof value !== 'string') {
        return '';
      }
      const inner: unknown = JSON.parse(value);
      return typeof inner === 'string' ? inner : '';
    };
    const credentials: Credentials = {
      username: field('username'),
      password: field('password'),
      fingerPrint: field('fingerPrint'),
      fingerGenPrint: field('fingerGenPrint'),
      fingerGenPrint3: field('fingerGenPrint3'),
    };
    return isCredentials(credentials) ? credentials : null;
  } catch {
    return null;
  }
};

const read = async (): Promise<Credentials | null> => {
  const current = await SecureStore.getItemAsync(CREDENTIALS_KEY, options);
  if (current) {
    return parse(current);
  }

  // One-time move from the redux-persist key. The legacy key is removed only
  // once the new one is written, so a failed write retries on next launch.
  const legacy = await SecureStore.getItemAsync(LEGACY_AUTH_KEY);
  if (!legacy) {
    return null;
  }
  const credentials = parseLegacyAuth(legacy);
  if (credentials) {
    await SecureStore.setItemAsync(
      CREDENTIALS_KEY,
      JSON.stringify(credentials),
      options,
    );
  }
  await SecureStore.deleteItemAsync(LEGACY_AUTH_KEY);
  return credentials;
};

let loading: Promise<Credentials | null> | null = null;

/**
 * Reads the saved login into memory. Safe to call more than once: later calls
 * share the first read. Resolves to null if nothing is saved or the read fails.
 */
export const loadCredentials = () => {
  loading ??= read()
    .catch(() => null)
    .then(credentials => {
      // A login that finished while the read was in flight wins.
      if (!getCredentials()) {
        useCredentialsStore.setState({ credentials });
      }
      return getCredentials();
    });
  return loading;
};

/**
 * Saves a login. The ephemeral mock account is kept in memory only, so it is
 * gone after a relaunch.
 */
export const saveCredentials = async (credentials: Credentials) => {
  useCredentialsStore.setState({ credentials });
  if (isEphemeralMockUser(credentials.username)) {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY, options);
    return;
  }
  await SecureStore.setItemAsync(
    CREDENTIALS_KEY,
    JSON.stringify(credentials),
    options,
  );
};

export const clearCredentials = async () => {
  useCredentialsStore.setState({ credentials: null });
  await Promise.all([
    SecureStore.deleteItemAsync(CREDENTIALS_KEY, options),
    // In case an earlier migration wrote the new key but failed to remove
    // this one; it must not bring the old login back after logging out.
    SecureStore.deleteItemAsync(LEGACY_AUTH_KEY),
  ]);
};
