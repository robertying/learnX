// The saved login (expo-secure-store's stand-in): each value encrypted with
// Electron's safeStorage (DPAPI on Windows, the keyring on Linux, the keychain
// on macOS) and kept as base64 in the file store's `secrets` database.

const DB = 'secrets';

/**
 * @param {ReturnType<typeof import('./fileStore.cjs').createFileStore>} store
 * @param {Pick<import('electron').SafeStorage, 'isEncryptionAvailable' | 'encryptString' | 'decryptString'>} safeStorage
 */
const createSecrets = (store, safeStorage) => ({
  /**
   * The value, or null when there is none or it can't be decrypted any more
   * (the system's key changed): the user signs in again.
   * @param {string} key
   */
  get: key => {
    const saved = store.getItem(DB, key);
    if (saved == null) {
      return null;
    }
    try {
      return safeStorage.decryptString(Buffer.from(saved, 'base64'));
    } catch {
      return null;
    }
  },
  /**
   * Refuses when the system has no encryption to offer (a Linux desktop
   * without a keyring), rather than writing the password in the clear.
   * @param {string} key
   * @param {string} value
   */
  set: (key, value) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available');
    }
    store.setItem(DB, key, safeStorage.encryptString(value).toString('base64'));
  },
  /** @param {string} key */
  remove: key => store.removeItem(DB, key),
});

module.exports = { createSecrets };
