// The saved login (expo-secure-store's stand-in): each value encrypted with
// Electron's safeStorage (DPAPI on Windows, the Secret Service or KWallet on
// Linux, the keychain on macOS) and kept as base64 in the file store's
// `secrets` database.

const DB = 'secrets';

/**
 * @param {ReturnType<typeof import('./fileStore.cjs').createFileStore>} store
 * @param {Pick<import('electron').SafeStorage, 'isAsyncEncryptionAvailable' | 'encryptStringAsync' | 'decryptStringAsync' | 'getSelectedStorageBackend'>} safeStorage
 * @param {{ platform?: string }} [options]
 */
const createSecrets = (
  store,
  safeStorage,
  { platform = process.platform } = {},
) => {
  /**
   * Whether the system keeps a key to encrypt with. On Linux without a
   * Secret Service or KWallet, Chromium falls back to a key written in its
   * own code (`basic_text`), which would only obscure the password.
   */
  const canEncrypt = async () =>
    (await safeStorage.isAsyncEncryptionAvailable()) &&
    !(
      platform === 'linux' &&
      safeStorage.getSelectedStorageBackend() === 'basic_text'
    );

  /** @param {string} key @param {string} value */
  const save = async (key, value) =>
    store.setItem(
      DB,
      key,
      (await safeStorage.encryptStringAsync(value)).toString('base64'),
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
        const { result, shouldReEncrypt } =
          await safeStorage.decryptStringAsync(Buffer.from(saved, 'base64'));
        if (shouldReEncrypt) {
          await save(key, result).catch(() => {});
        }
        return result;
      } catch {
        return null;
      }
    },
    /**
     * Refuses when the system has no key to encrypt with (a Linux desktop
     * without a keyring), rather than writing the password where anyone who
     * reads the file could read it.
     * @param {string} key
     * @param {string} value
     */
    set: async (key, value) => {
      if (!(await canEncrypt())) {
        throw new Error('Encryption is not available');
      }
      await save(key, value);
    },
    /** @param {string} key */
    remove: async key => store.removeItem(DB, key),
  };
};

module.exports = { createSecrets };
