import * as SecureStore from 'expo-secure-store';
// The fixture helpers/env is mocked with (jest/setup.ts), typed as strings.
import env from '../../../jest/mocks/env';

type Module = typeof import('data/credentials');

const keychain: Map<string, string> = (SecureStore as any).__store;

const credentials = {
  username: '2020011234',
  password: 'secret',
  fingerPrint: 'fp',
  fingerGenPrint: 'fgp',
  fingerGenPrint3: 'fgp3',
};

/** What redux-persist-expo-securestore wrote for the auth slice. */
const legacyAuth = (auth: Record<string, string | null>) =>
  JSON.stringify({
    ...Object.fromEntries(
      Object.entries(auth).map(([key, value]) => [key, JSON.stringify(value)]),
    ),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  });

// A fresh module per test: loadCredentials reads storage only once.
let m: Module;
beforeEach(() => {
  keychain.clear();
  jest.isolateModules(() => {
    m = require('data/credentials');
  });
});

describe('loadCredentials', () => {
  it('resolves to null when nothing is saved', async () => {
    await expect(m.loadCredentials()).resolves.toBeNull();
    expect(m.getCredentials()).toBeNull();
  });

  it('reads saved credentials', async () => {
    keychain.set(m.CREDENTIALS_KEY, JSON.stringify(credentials));
    await expect(m.loadCredentials()).resolves.toEqual(credentials);
    expect(m.getCredentials()).toEqual(credentials);
  });

  it('reads storage once however often it is called', async () => {
    await Promise.all([m.loadCredentials(), m.loadCredentials()]);
    await m.loadCredentials();
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2); // new + legacy
  });

  it('moves a logged-in 18.0.3 install to the new key', async () => {
    keychain.set(m.LEGACY_AUTH_KEY, legacyAuth(credentials));
    await expect(m.loadCredentials()).resolves.toEqual(credentials);
    expect(JSON.parse(keychain.get(m.CREDENTIALS_KEY)!)).toEqual(credentials);
    expect(keychain.has(m.LEGACY_AUTH_KEY)).toBe(false);
  });

  it('keeps a legacy login that has no fingerprints yet', async () => {
    keychain.set(
      m.LEGACY_AUTH_KEY,
      legacyAuth({
        username: 'u',
        password: 'p',
        fingerPrint: null,
        fingerGenPrint: null,
        fingerGenPrint3: null,
      }),
    );
    await expect(m.loadCredentials()).resolves.toEqual({
      username: 'u',
      password: 'p',
      fingerPrint: '',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    });
  });

  it('drops a legacy entry without a login', async () => {
    keychain.set(
      m.LEGACY_AUTH_KEY,
      legacyAuth({ username: null, password: null, fingerPrint: null }),
    );
    await expect(m.loadCredentials()).resolves.toBeNull();
    expect(keychain.size).toBe(0);
  });

  it('keeps the legacy entry when the new key cannot be written', async () => {
    keychain.set(m.LEGACY_AUTH_KEY, legacyAuth(credentials));
    jest
      .mocked(SecureStore.setItemAsync)
      .mockRejectedValueOnce(new Error('keychain unavailable'));
    await expect(m.loadCredentials()).resolves.toBeNull();
    expect(keychain.has(m.LEGACY_AUTH_KEY)).toBe(true);
  });

  it('prefers the new key over a leftover legacy entry', async () => {
    const newer = { ...credentials, password: 'newer' };
    keychain.set(m.CREDENTIALS_KEY, JSON.stringify(newer));
    keychain.set(m.LEGACY_AUTH_KEY, legacyAuth(credentials));
    await expect(m.loadCredentials()).resolves.toEqual(newer);
  });

  it('ignores a corrupt entry', async () => {
    keychain.set(m.CREDENTIALS_KEY, '{not json');
    await expect(m.loadCredentials()).resolves.toBeNull();
  });

  it('does not overwrite a login that finished during the read', async () => {
    keychain.set(m.CREDENTIALS_KEY, JSON.stringify(credentials));
    const loading = m.loadCredentials();
    const fresh = { ...credentials, username: 'fresh' };
    await m.saveCredentials(fresh);
    await expect(loading).resolves.toEqual(fresh);
  });

  it('resolves to the login as it is now on later calls', async () => {
    await expect(m.loadCredentials()).resolves.toBeNull();
    // Logged in after the first read, as on a fresh install.
    await m.saveCredentials(credentials);
    await expect(m.loadCredentials()).resolves.toEqual(credentials);
    // Logged out, then in as someone else.
    await m.clearCredentials();
    await expect(m.loadCredentials()).resolves.toBeNull();
    const other = { ...credentials, username: 'other' };
    await m.saveCredentials(other);
    await expect(m.loadCredentials()).resolves.toEqual(other);
  });
});

describe('saveCredentials', () => {
  it('saves to the keychain and memory', async () => {
    await m.saveCredentials(credentials);
    expect(m.getCredentials()).toEqual(credentials);
    expect(JSON.parse(keychain.get(m.CREDENTIALS_KEY)!)).toEqual(credentials);
  });

  it('keeps the ephemeral mock account in memory only', async () => {
    await m.saveCredentials(credentials);
    const mock = { ...credentials, username: env.DUMMY_USERNAME };
    await m.saveCredentials(mock);
    expect(m.getCredentials()).toEqual(mock);
    expect(keychain.has(m.CREDENTIALS_KEY)).toBe(false);
  });

  it('notifies subscribers', async () => {
    const listener = jest.fn();
    const unsubscribe = m.useCredentialsStore.subscribe(listener);
    await m.saveCredentials(credentials);
    expect(listener).toHaveBeenCalledWith(
      { credentials },
      { credentials: null },
    );
    unsubscribe();
  });
});

describe('clearCredentials', () => {
  it('removes the new and the legacy key', async () => {
    await m.saveCredentials(credentials);
    keychain.set(m.LEGACY_AUTH_KEY, legacyAuth(credentials));
    await m.clearCredentials();
    expect(m.getCredentials()).toBeNull();
    expect(keychain.size).toBe(0);
  });
});
