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
 *   'isAsyncEncryptionAvailable' | 'encryptStringAsync' | 'decryptStringAsync'>} SafeStorage
 */

/**
 * The tag Chromium starts a value with when a key from the system's keyring
 * (the Secret Service or KWallet) encrypted it, on Linux; `v10` is its own
 * fallback key, written in its code.
 */
const KEYRING_KEY_TAG = 'v11';

/**
 * The encryption: safeStorage's asynchronous APIs, as Electron 45
 * recommends, which never ask the keyring on the main process's thread (the
 * synchronous ones held it, the window frozen, while GNOME's unlock prompt
 * was up, and asked again after Cancel). `ready` waits for that prompt. On
 * Linux a value is saved only if the keyring's key encrypted it (tagged
 * `v11`): without a Secret Service or KWallet, or with its unlock cancelled,
 * Chromium falls back to its own key, which only obscures the value. A dev
 * run (`allowFallbackKey`) takes that key, on purpose (`--password-store=
 * basic`), to keep its login out of the system's keyring.
 * @param {SafeStorage} safeStorage
 * @param {string} platform
 * @param {boolean} allowFallbackKey
 */
const encryptionOf = (safeStorage, platform, allowFallbackKey) => ({
  ready: () => safeStorage.isAsyncEncryptionAvailable(),
  encrypt: async (/** @type {string} */ text) => {
    const encrypted = await safeStorage.encryptStringAsync(text);
    if (
      platform === 'linux' &&
      !allowFallbackKey &&
      encrypted.subarray(0, KEYRING_KEY_TAG.length).toString() !==
        KEYRING_KEY_TAG
    ) {
      throw new Error('Encryption is not available');
    }
    return encrypted;
  },
  decrypt: (/** @type {Buffer} */ data) => safeStorage.decryptStringAsync(data),
});

/** What `within` resolves to when the wait ran out first. */
const TIMED_OUT = Symbol('timed out');

/**
 * @param {ReturnType<typeof import('./fileStore.cjs').createFileStore>} store
 * @param {SafeStorage} safeStorage
 * @param {{ platform?: string; allowFallbackKey?: boolean; unlockWaitMs?: number; saveWaitMs?: number }} [options]
 *   `allowFallbackKey`: a dev run's, on Chromium's own key
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
          if (!open) {
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
