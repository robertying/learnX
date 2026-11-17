import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileStore } from '../fileStore.cjs';
import { createSecrets } from '../secrets.cjs';

/** Reverses the bytes, so a saved value never reads as the value. */
const fakeSafeStorage = ({
  available = true,
  backend = 'gnome_libsecret',
  rotated = false,
} = {}) => ({
  isAsyncEncryptionAvailable: async () => available,
  getSelectedStorageBackend: () => backend as never,
  encryptStringAsync: jest.fn(async (text: string) =>
    Buffer.from(text).reverse(),
  ),
  decryptStringAsync: async (data: Buffer) => {
    if (data.length === 0) {
      throw new Error('Error while decrypting the ciphertext');
    }
    return {
      result: Buffer.from(data).reverse().toString(),
      shouldReEncrypt: rotated,
    };
  },
});

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-secrets-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

it('keeps a value encrypted', async () => {
  const store = createFileStore(root);
  const secrets = createSecrets(store, fakeSafeStorage());
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
  const store = createFileStore(root);
  store.setItem('secrets', 'credentials', '');
  await expect(
    createSecrets(store, fakeSafeStorage()).get('credentials'),
  ).resolves.toBeNull();
});

it('saves a value again when its key has been rotated', async () => {
  const store = createFileStore(root);
  const safeStorage = fakeSafeStorage({ rotated: true });
  const secrets = createSecrets(store, safeStorage);
  await secrets.set('credentials', 'x');
  safeStorage.encryptStringAsync.mockClear();
  await expect(secrets.get('credentials')).resolves.toBe('x');
  expect(safeStorage.encryptStringAsync).toHaveBeenCalledWith('x');
});

it.each([
  ['without encryption', { available: false }, 'win32'],
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

it('saves with a keyring on Linux', async () => {
  const store = createFileStore(root);
  const secrets = createSecrets(store, fakeSafeStorage(), {
    platform: 'linux',
  });
  await secrets.set('credentials', 'x');
  await expect(secrets.get('credentials')).resolves.toBe('x');
});
