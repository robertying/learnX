// The saved login (expo-secure-store's stand-in): each value encrypted with
// Electron's safeStorage (DPAPI on Windows, the Secret Service or KWallet on
// Linux, the keychain on macOS) and kept as base64 in the file store's
// `secrets` database.

const DB = 'secrets';

/**
 * @typedef {Pick<import('electron').SafeStorage,
 *   'isAsyncEncryptionAvailable' | 'encryptStringAsync' | 'decryptStringAsync'
 *   | 'isEncryptionAvailable' | 'encryptString' | 'decryptString'
 *   | 'getSelectedStorageBackend'>} SafeStorage
 */

/**
 * The encryption to use. On Linux, the one whose key store
 * `getSelectedStorageBackend` reports: Chromium's synchronous OSCrypt, which
 * that report describes (the asynchronous encryptor picks its own provider,
 * which nothing reports), so the check that refuses Chromium's fallback key
 * (`basic_text`) is about the key the value is actually encrypted with. The
 * report is read after `isEncryptionAvailable()`, which initializes it.
 * Elsewhere, the asynchronous APIs, as Electron 45 recommends.
 * @param {SafeStorage} safeStorage
 * @param {string} platform
 */
const encryptionOf = (safeStorage, platform) =>
  platform === 'linux'
    ? {
        canEncrypt: async () =>
          safeStorage.isEncryptionAvailable() &&
          safeStorage.getSelectedStorageBackend() !== 'basic_text',
        encrypt: async (/** @type {string} */ text) =>
          safeStorage.encryptString(text),
        decrypt: async (/** @type {Buffer} */ data) => ({
          result: safeStorage.decryptString(data),
          shouldReEncrypt: false,
        }),
      }
    : {
        canEncrypt: () => safeStorage.isAsyncEncryptionAvailable(),
        encrypt: (/** @type {string} */ text) =>
          safeStorage.encryptStringAsync(text),
        decrypt: (/** @type {Buffer} */ data) =>
          safeStorage.decryptStringAsync(data),
      };

/**
 * @param {ReturnType<typeof import('./fileStore.cjs').createFileStore>} store
 * @param {SafeStorage} safeStorage
 * @param {{ platform?: string }} [options]
 */
const createSecrets = (
  store,
  safeStorage,
  { platform = process.platform } = {},
) => {
  const encryption = encryptionOf(safeStorage, platform);

  /** @param {string} key @param {string} value */
  const save = async (key, value) =>
    store.setItem(
      DB,
      key,
      (await encryption.encrypt(value)).toString('base64'),
    );

  return {
    /**
     * The value, or null when there is none or it can't be decrypted any
     * more (the system's key changed): the user signs in again. A value
     * whose key has been rotated is saved again with the new one.
     * @param {string} key
     * @returns {Promise<string | null>}
     */
    get: async key => {
      const saved = store.getItem(DB, key);
      if (saved == null) {
        return null;
      }
      try {
        const { result, shouldReEncrypt } = await encryption.decrypt(
          Buffer.from(saved, 'base64'),
        );
        if (shouldReEncrypt) {
          await save(key, result).catch(() => {});
        }
        return result;
      } catch {
        return null;
      }
    },
    /**
     * Refuses when the system has no key of its own to encrypt with (a
     * Linux desktop without a Secret Service or KWallet, where Chromium
     * would use a key written in its own code), rather than writing the
     * password where anyone who reads the file could read it.
     * @param {string} key
     * @param {string} value
     */
    set: async (key, value) => {
      if (!(await encryption.canEncrypt())) {
        throw new Error('Encryption is not available');
      }
      await save(key, value);
    },
    /** @param {string} key */
    remove: async key => store.removeItem(DB, key),
  };
};

module.exports = { createSecrets };
