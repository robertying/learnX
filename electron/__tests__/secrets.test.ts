import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileStore } from '../fileStore.cjs';
import { createSecrets } from '../secrets.cjs';

/**
 * safeStorage's asynchronous APIs, which tag a value with the key that
 * encrypted it, as Chromium does on Linux: `v11` for the keyring's key,
 * `v10` for its own fallback key (`fallback`: no keyring, or its unlock
 * cancelled). The rest is the text reversed.
 */
const fakeSafeStorage = ({
  available = true,
  fallback = false,
  rotated = false,
  unlocked = Promise.resolve(),
} = {}) => {
  const tag = fallback ? 'v10' : 'v11';
  return {
    // Resolves once the keyring is unlocked (or its unlock cancelled), as
    // Chromium's async encryptor's initialization waits for the prompt.
    isAsyncEncryptionAvailable: jest.fn(async () => {
      await unlocked;
      return available;
    }),
    encryptStringAsync: jest.fn(async (text: string) =>
      Buffer.concat([Buffer.from(tag), Buffer.from(text).reverse()]),
    ),
    decryptStringAsync: async (data: Buffer) => {
      if (data.subarray(0, 3).toString() !== tag) {
        throw new Error('Error while decrypting the ciphertext');
      }
      return {
        result: Buffer.from(data.subarray(3)).reverse().toString(),
        shouldReEncrypt: rotated,
      };
    },
  };
};

/** What the fake stores for `text` with the keyring's key. */
const saved = (text: string) =>
  Buffer.concat([Buffer.from('v11'), Buffer.from(text).reverse()]).toString(
    'base64',
  );

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
  ['with only the fallback key on Linux', { fallback: true }, 'linux'],
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
  const secrets = createSecrets(store, fakeSafeStorage({ fallback: true }), {
    platform: 'linux',
    allowFallbackKey: true,
  });
  await secrets.set('credentials', 'x');
  await expect(secrets.get('credentials')).resolves.toBe('x');
});

describe('a locked keyring on Linux', () => {
  /** A keyring whose unlock prompt is up until it's answered. */
  const locked = ({ fallback = false } = {}) => {
    let answer!: () => void;
    const unlocked = new Promise<void>(resolve => {
      answer = resolve;
    });
    return { safeStorage: fakeSafeStorage({ unlocked, fallback }), answer };
  };
  const options = { platform: 'linux', unlockWaitMs: 50, saveWaitMs: 10 };
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));

  it('logs in at once, and saves the login once it’s unlocked', async () => {
    const store = createFileStore(root);
    const { safeStorage, answer } = locked();
    const secrets = createSecrets(store, safeStorage, options);
    await secrets.set('credentials', 'x');
    await expect(secrets.get('credentials')).resolves.toBe('x');
    expect(safeStorage.encryptStringAsync).not.toHaveBeenCalled();
    expect(store.getItem('secrets', 'credentials')).toBeNull();
    answer();
    await settle();
    expect(store.getItem('secrets', 'credentials')).toBe(saved('x'));
    await expect(secrets.get('credentials')).resolves.toBe('x');
  });

  it('goes on without a saved login it can’t read in time, and keeps it', async () => {
    const store = createFileStore(root);
    store.setItem('secrets', 'credentials', saved('x'));
    const secrets = createSecrets(store, locked().safeStorage, options);
    await expect(secrets.get('credentials')).resolves.toBeNull();
    expect(store.getItem('secrets', 'credentials')).toBe(saved('x'));
  });

  it('reads a saved login once it’s unlocked in time', async () => {
    const store = createFileStore(root);
    store.setItem('secrets', 'credentials', saved('x'));
    const { safeStorage, answer } = locked();
    const secrets = createSecrets(store, safeStorage, options);
    const value = secrets.get('credentials');
    answer();
    await expect(value).resolves.toBe('x');
  });

  it('drops a value removed or replaced before it’s unlocked', async () => {
    const store = createFileStore(root);
    const { safeStorage, answer } = locked();
    const secrets = createSecrets(store, safeStorage, options);
    await secrets.set('credentials', 'x');
    await secrets.remove('credentials');
    await secrets.set('persist_auth', 'a');
    await secrets.set('persist_auth', 'b');
    answer();
    await settle();
    expect(store.getItem('secrets', 'credentials')).toBeNull();
    expect(safeStorage.encryptStringAsync).toHaveBeenCalledTimes(1);
    await expect(secrets.get('persist_auth')).resolves.toBe('b');
  });

  it('saves nothing when the unlock is cancelled, and says so', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const store = createFileStore(root);
    store.setItem('secrets', 'persist_auth', saved('a'));
    // Cancelled: Chromium goes on with its own key.
    const { safeStorage, answer } = locked({ fallback: true });
    const secrets = createSecrets(store, safeStorage, options);
    await secrets.set('credentials', 'x');
    answer();
    await settle();
    expect(error).toHaveBeenCalledWith(
      '[secrets] not saved: Encryption is not available',
    );
    expect(store.getItem('secrets', 'credentials')).toBeNull();
    await expect(secrets.get('credentials')).resolves.toBeNull();
    // A login saved with the keyring's key stays for a launch that has it.
    await expect(secrets.get('persist_auth')).resolves.toBeNull();
    expect(store.getItem('secrets', 'persist_auth')).toBe(saved('a'));
  });
});
