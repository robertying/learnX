import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileStore } from '../fileStore.cjs';
import { createSecrets } from '../secrets.cjs';

/** Reverses the bytes, so a saved value never reads as the value. */
const fakeSafeStorage = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: (text: string) => Buffer.from(text).reverse(),
  decryptString: (data: Buffer) => {
    if (data.length === 0) {
      throw new Error('Error while decrypting the ciphertext');
    }
    return Buffer.from(data).reverse().toString();
  },
});

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-secrets-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

it('keeps a value encrypted', () => {
  const store = createFileStore(root);
  const secrets = createSecrets(store, fakeSafeStorage());
  expect(secrets.get('credentials')).toBeNull();
  secrets.set('credentials', '{"password":"secret"}');
  expect(secrets.get('credentials')).toBe('{"password":"secret"}');
  expect(store.getItem('secrets', 'credentials')).not.toContain('secret');
  secrets.remove('credentials');
  expect(secrets.get('credentials')).toBeNull();
});

it('forgets a value it can no longer decrypt', () => {
  const store = createFileStore(root);
  store.setItem('secrets', 'credentials', '');
  expect(createSecrets(store, fakeSafeStorage()).get('credentials')).toBeNull();
});

it('refuses to save without encryption', () => {
  const store = createFileStore(root);
  const secrets = createSecrets(store, fakeSafeStorage(false));
  expect(() => secrets.set('credentials', 'x')).toThrow(
    'Encryption is not available',
  );
  expect(store.getItem('secrets', 'credentials')).toBeNull();
});
