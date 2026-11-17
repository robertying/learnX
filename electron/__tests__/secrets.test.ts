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
} = {}) => {
  let initialized = false;
  const fail = (data: Buffer) => {
    if (data.length === 0) {
      throw new Error('Error while decrypting the ciphertext');
    }
  };
  return {
    isAsyncEncryptionAvailable: async () => available,
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
    isEncryptionAvailable: () => {
      initialized = true;
      return available;
    },
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
