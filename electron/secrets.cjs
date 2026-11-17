// The saved login (expo-secure-store's stand-in): each value encrypted with
// Electron's safeStorage (DPAPI on Windows, the Secret Service or KWallet on
// Linux, the keychain on macOS) and kept as base64 in the file store's
// `secrets` database.

const DB = 'secrets';

/**
 * How long a read waits for a locked key store (Linux: the keyring's unlock
 * prompt, while the user types its password) before the app goes on without
 * the saved login, which stays saved for the next launch.
 */
const UNLOCK_WAIT_MS = 30_000;
/**
 * How long a save waits for a locked key store before the login goes on
 * without it: the value is kept in memory and saved once the store opens.
 */
const SAVE_WAIT_MS = 1_000;

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
 * OSCrypt asks for the key on the main process's thread, which a locked
 * keyring would hold for as long as its unlock prompt is up (the window
 * frozen), so nothing calls it before `ready`: the asynchronous encryptor's
 * check, which waits for the prompt off that thread.
 * Elsewhere, the asynchronous APIs, as Electron 45 recommends.
 * @param {SafeStorage} safeStorage
 * @param {string} platform
 * A dev run's (`allowFallbackKey`), on Chromium's own key (`--password-store=
 * basic`), uses the asynchronous APIs on Linux too: OSCrypt reports no
 * encryption with that key.
 * @param {boolean} allowFallbackKey whether Chromium's fallback key will do
 */
const encryptionOf = (safeStorage, platform, allowFallbackKey) =>
  platform === 'linux' && !allowFallbackKey
    ? {
        ready: () => safeStorage.isAsyncEncryptionAvailable(),
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
        ready: async () => true,
        canEncrypt: () => safeStorage.isAsyncEncryptionAvailable(),
        encrypt: (/** @type {string} */ text) =>
          safeStorage.encryptStringAsync(text),
        decrypt: (/** @type {Buffer} */ data) =>
          safeStorage.decryptStringAsync(data),
      };

/** What `within` resolves to when the wait ran out first. */
const TIMED_OUT = Symbol('timed out');

/**
 * @param {ReturnType<typeof import('./fileStore.cjs').createFileStore>} store
 * @param {SafeStorage} safeStorage
 * @param {{ platform?: string; allowFallbackKey?: boolean; unlockWaitMs?: number; saveWaitMs?: number }} [options]
 *   `allowFallbackKey`: a dev run's, whose Linux key store is Chromium's own
 */
const createSecrets = (
  store,
  safeStorage,
  {
    platform = process.platform,
    allowFallbackKey = false,
    unlockWaitMs = UNLOCK_WAIT_MS,
    saveWaitMs = SAVE_WAIT_MS,
  } = {},
) => {
  const encryption = encryptionOf(safeStorage, platform, allowFallbackKey);

  /** @type {Promise<boolean> | undefined} */
  let ready;
  /** Whether the key store is open: asked once, resolved once it opens. */
  const keyStore = () =>
    (ready ??= Promise.resolve()
      .then(() => encryption.ready())
      .catch(() => false));

  /**
   * The promise's value, or TIMED_OUT if it takes longer than `ms`.
   * @template T
   * @param {Promise<T>} promise
   * @param {number} ms
   * @returns {Promise<T | typeof TIMED_OUT>}
   */
  const within = (promise, ms) => {
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer;
    return Promise.race([
      promise,
      new Promise(resolve => {
        timer = setTimeout(() => resolve(TIMED_OUT), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  };

  /** @param {string} key @param {string} value */
  const save = async (key, value) =>
    store.setItem(
      DB,
      key,
      (await encryption.encrypt(value)).toString('base64'),
    );

  /**
   * Values waiting for the key store to open, by key: read back from here
   * meanwhile, and dropped if removed or replaced first.
   * @type {Map<string, string>}
   */
  const unsaved = new Map();

  return {
    /**
     * The value, or null when there is none or it can't be decrypted any
     * more (the system's key changed), or the key store stays locked: the
     * user signs in again. A value whose key has been rotated is saved
     * again with the new one.
     * @param {string} key
     * @returns {Promise<string | null>}
     */
    get: async key => {
      const waiting = unsaved.get(key);
      if (waiting !== undefined) {
        return waiting;
      }
      const saved = store.getItem(DB, key);
      if (saved == null) {
        return null;
      }
      if ((await within(keyStore(), unlockWaitMs)) !== true) {
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
     * password where anyone who reads the file could read it. While the key
     * store is locked (its unlock prompt up), resolves after a moment and
     * saves the value once it opens; until then it's only in memory.
     * @param {string} key
     * @param {string} value
     */
    set: async (key, value) => {
      unsaved.set(key, value);
      const saving = (async () => {
        const open = await keyStore();
        if (unsaved.get(key) !== value) {
          return;
        }
        try {
          if (!open || !(await encryption.canEncrypt())) {
            throw new Error('Encryption is not available');
          }
          await save(key, value);
        } finally {
          if (unsaved.get(key) === value) {
            unsaved.delete(key);
          }
        }
      })();
      if ((await within(saving, saveWaitMs)) === TIMED_OUT) {
        saving.catch(error =>
          console.error(`[secrets] not saved: ${error.message}`),
        );
      }
    },
    /** @param {string} key */
    remove: async key => {
      unsaved.delete(key);
      store.removeItem(DB, key);
    },
  };
};

module.exports = { createSecrets };
