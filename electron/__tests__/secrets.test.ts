import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileStore } from '../fileStore.cjs';
import { createSecrets } from '../secrets.cjs';

/**
 * safeStorage, with each API leaving its own mark, so a test sees which one
 * encrypted: the async ones reverse the bytes, the sync ones (Linux's
 * OSCrypt) add one to each. As Chromium's OSCrypt, the backend reads
 * `unknown` until encryption is first asked about.
 */
const fakeSafeStorage = ({
  available = true,
  backend = 'gnome_libsecret',
  rotated = false,
  unlocked = Promise.resolve(),
} = {}) => {
  let initialized = false;
  const fail = (data: Buffer) => {
    if (data.length === 0) {
      throw new Error('Error while decrypting the ciphertext');
    }
  };
  return {
    // Resolves once the keyring is unlocked, as Chromium's async encryptor's
    // initialization waits for the unlock prompt.
    isAsyncEncryptionAvailable: jest.fn(async () => {
      await unlocked;
      return available;
    }),
    encryptStringAsync: jest.fn(async (text: string) =>
      Buffer.from(text).reverse(),
    ),
    decryptStringAsync: async (data: Buffer) => {
      fail(data);
      return {
        result: Buffer.from(data).reverse().toString(),
        shouldReEncrypt: rotated,
      };
    },
    isEncryptionAvailable: jest.fn(() => {
      initialized = true;
      return available;
    }),
    encryptString: jest.fn((text: string) =>
      Buffer.from(Buffer.from(text).map(byte => byte + 1)),
    ),
    decryptString: (data: Buffer) => {
      fail(data);
      return Buffer.from(data.map(byte => byte - 1)).toString();
    },
    getSelectedStorageBackend: () =>
      (initialized ? backend : 'unknown') as never,
  };
};

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-secrets-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

it.each(['win32', 'linux'])('keeps a value encrypted on %s', async platform => {
  const store = createFileStore(root);
  const secrets = createSecrets(store, fakeSafeStorage(), { platform });
  await expect(secrets.get('credentials')).resolves.toBeNull();
  await secrets.set('credentials', '{"password":"secret"}');
  await expect(secrets.get('credentials')).resolves.toBe(
    '{"password":"secret"}',
  );
  expect(store.getItem('secrets', 'credentials')).not.toContain('secret');
  await secrets.remove('credentials');
  await expect(secrets.get('credentials')).resolves.toBeNull();
});

it('encrypts on Linux with the OSCrypt whose key store it checked', async () => {
  const store = createFileStore(root);
  const safeStorage = fakeSafeStorage();
  await createSecrets(store, safeStorage, { platform: 'linux' }).set(
    'credentials',
    'x',
  );
  expect(safeStorage.encryptString).toHaveBeenCalledWith('x');
  expect(safeStorage.encryptStringAsync).not.toHaveBeenCalled();
  expect(store.getItem('secrets', 'credentials')).toBe(
    Buffer.from('y').toString('base64'),
  );
});

it('forgets a value it can no longer decrypt', async () => {
  for (const platform of ['win32', 'linux']) {
    const store = createFileStore(root);
    store.setItem('secrets', 'credentials', '');
    await expect(
      createSecrets(store, fakeSafeStorage(), { platform }).get('credentials'),
    ).resolves.toBeNull();
  }
});

it('saves a value again when its key has been rotated', async () => {
  const store = createFileStore(root);
  const safeStorage = fakeSafeStorage({ rotated: true });
  const secrets = createSecrets(store, safeStorage, { platform: 'win32' });
  await secrets.set('credentials', 'x');
  safeStorage.encryptStringAsync.mockClear();
  await expect(secrets.get('credentials')).resolves.toBe('x');
  expect(safeStorage.encryptStringAsync).toHaveBeenCalledWith('x');
});

it.each([
  ['without encryption', { available: false }, 'win32'],
  ['without encryption on Linux', { available: false }, 'linux'],
  // Chromium's fallback key on Linux without a keyring only obscures it.
  ['with only the fallback key on Linux', { backend: 'basic_text' }, 'linux'],
])('refuses to save %s', async (_name, storage, platform) => {
  const store = createFileStore(root);
  const secrets = createSecrets(store, fakeSafeStorage(storage), { platform });
  await expect(secrets.set('credentials', 'x')).rejects.toThrow(
    'Encryption is not available',
  );
  expect(store.getItem('secrets', 'credentials')).toBeNull();
});

it('saves with the fallback key on Linux when a dev run allows it', async () => {
  const store = createFileStore(root);
  const safeStorage = fakeSafeStorage({ backend: 'basic_text' });
  const secrets = createSecrets(store, safeStorage, {
    platform: 'linux',
    allowFallbackKey: true,
  });
  await secrets.set('credentials', 'x');
  await expect(secrets.get('credentials')).resolves.toBe('x');
  // OSCrypt reports no encryption with Chromium's own key: the async APIs.
  expect(safeStorage.encryptStringAsync).toHaveBeenCalledWith('x');
  expect(safeStorage.isEncryptionAvailable).not.toHaveBeenCalled();
});

it.each(['gnome_libsecret', 'kwallet6'])(
  'saves with a keyring on Linux (%s)',
  async backend => {
    const store = createFileStore(root);
    const secrets = createSecrets(store, fakeSafeStorage({ backend }), {
      platform: 'linux',
    });
    await secrets.set('credentials', 'x');
    await expect(secrets.get('credentials')).resolves.toBe('x');
  },
);

describe('a locked keyring on Linux', () => {
  /** A keyring whose unlock prompt is up until `unlock()`. */
  const locked = () => {
    let unlock!: () => void;
    const unlocked = new Promise<void>(resolve => {
      unlock = resolve;
    });
    return { safeStorage: fakeSafeStorage({ unlocked }), unlock };
  };
  const options = { platform: 'linux', unlockWaitMs: 50, saveWaitMs: 10 };

  it('never asks OSCrypt (on the main thread) while it’s locked', async () => {
    const store = createFileStore(root);
    store.setItem(
      'secrets',
      'credentials',
      Buffer.from('y').toString('base64'),
    );
    const { safeStorage } = locked();
    const secrets = createSecrets(store, safeStorage, options);
    await expect(secrets.get('credentials')).resolves.toBeNull();
    await secrets.set('credentials', 'x');
    expect(safeStorage.isEncryptionAvailable).not.toHaveBeenCalled();
    expect(safeStorage.encryptString).not.toHaveBeenCalled();
    // The saved login stays for a later launch.
    expect(store.getItem('secrets', 'credentials')).toBe(
      Buffer.from('y').toString('base64'),
    );
  });

  it('logs in at once, and saves the login once it’s unlocked', async () => {
    const store = createFileStore(root);
    const { safeStorage, unlock } = locked();
    const secrets = createSecrets(store, safeStorage, options);
    await secrets.set('credentials', 'x');
    await expect(secrets.get('credentials')).resolves.toBe('x');
    expect(store.getItem('secrets', 'credentials')).toBeNull();
    unlock();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(store.getItem('secrets', 'credentials')).toBe(
      Buffer.from('y').toString('base64'),
    );
    await expect(secrets.get('credentials')).resolves.toBe('x');
  });

  it('reads a saved login once it’s unlocked in time', async () => {
    const store = createFileStore(root);
    store.setItem(
      'secrets',
      'credentials',
      Buffer.from('y').toString('base64'),
    );
    const { safeStorage, unlock } = locked();
    const secrets = createSecrets(store, safeStorage, options);
    const value = secrets.get('credentials');
    unlock();
    await expect(value).resolves.toBe('x');
  });

  it('drops a value removed or replaced before it’s unlocked', async () => {
    const store = createFileStore(root);
    const { safeStorage, unlock } = locked();
    const secrets = createSecrets(store, safeStorage, options);
    await secrets.set('credentials', 'x');
    await secrets.remove('credentials');
    await secrets.set('persist_auth', 'a');
    await secrets.set('persist_auth', 'b');
    unlock();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(store.getItem('secrets', 'credentials')).toBeNull();
    expect(safeStorage.encryptString).toHaveBeenCalledTimes(1);
    await expect(secrets.get('persist_auth')).resolves.toBe('b');
  });

  it('logs a value it couldn’t save after all', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const store = createFileStore(root);
    let unlock!: () => void;
    const unlocked = new Promise<void>(resolve => {
      unlock = resolve;
    });
    const secrets = createSecrets(
      store,
      fakeSafeStorage({ unlocked, backend: 'basic_text' }),
      options,
    );
    await secrets.set('credentials', 'x');
    unlock();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(error).toHaveBeenCalledWith(
      '[secrets] not saved: Encryption is not available',
    );
    expect(store.getItem('secrets', 'credentials')).toBeNull();
    await expect(secrets.get('credentials')).resolves.toBeNull();
  });
});
