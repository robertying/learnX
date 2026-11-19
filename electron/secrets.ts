// The saved login (expo-secure-store's stand-in): each value encrypted with
// Electron's safeStorage (DPAPI on Windows, the Secret Service or KWallet on
// Linux, the keychain on macOS) and kept as base64 in the file store's
// `secrets` database.
import type { FileStore } from './fileStore.ts';

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

type SafeStorage = Pick<
  Electron.SafeStorage,
  'isAsyncEncryptionAvailable' | 'encryptStringAsync' | 'decryptStringAsync'
>;

/**
 * The tag Chromium starts a value with on Linux when its own fallback key,
 * written in its code, encrypted it. A key from the system's keyring (the
 * Secret Service, KWallet, or the Secret portal for sandboxed installs)
 * tags it otherwise (`v11` for the first two).
 */
const FALLBACK_KEY_TAG = 'v10';

/**
 * The encryption: safeStorage's asynchronous APIs, as Electron
 * recommends, which never ask the keyring on the main process's thread (the
 * synchronous ones block it, and the window, for as long as GNOME's unlock
 * prompt is up). `ready` waits for that prompt. On
 * Linux a value isn't saved when Chromium's own key encrypted it (tagged
 * `v10`), as it does without a Secret Service or KWallet, or with the
 * keyring's unlock cancelled: that key only obscures the value. A dev
 * run (`allowFallbackKey`) takes that key, on purpose (`--password-store=
 * basic`), to keep its login out of the system's keyring.
 */
const encryptionOf = (
  safeStorage: SafeStorage,
  platform: string,
  allowFallbackKey: boolean,
) => ({
  ready: () => safeStorage.isAsyncEncryptionAvailable(),
  encrypt: async (text: string) => {
    const encrypted = await safeStorage.encryptStringAsync(text);
    const tag = encrypted.subarray(0, FALLBACK_KEY_TAG.length).toString();
    if (platform === 'linux' && !allowFallbackKey && tag === FALLBACK_KEY_TAG) {
      throw new Error(
        `Encryption is not available (${tag}: Chromium's own key)`,
      );
    }
    return encrypted;
  },
  decrypt: (data: Buffer) => safeStorage.decryptStringAsync(data),
});

/** What `within` resolves to when the wait ran out first. */
const TIMED_OUT = Symbol('timed out');

export const createSecrets = (
  store: FileStore,
  safeStorage: SafeStorage,
  {
    platform = process.platform,
    allowFallbackKey = false,
    unlockWaitMs = UNLOCK_WAIT_MS,
    saveWaitMs = SAVE_WAIT_MS,
  }: {
    platform?: string;
    /** A dev run's, on Chromium's own key. */
    allowFallbackKey?: boolean;
    unlockWaitMs?: number;
    saveWaitMs?: number;
  } = {},
) => {
  const encryption = encryptionOf(safeStorage, platform, allowFallbackKey);

  let ready: Promise<boolean> | undefined;
  /** Whether the key store is open: asked once, resolved once it opens. */
  const keyStore = () =>
    (ready ??= Promise.resolve()
      .then(() => encryption.ready())
      .catch(() => false));

  /** The promise's value, or TIMED_OUT if it takes longer than `ms`. */
  const within = <T>(
    promise: Promise<T>,
    ms: number,
  ): Promise<T | typeof TIMED_OUT> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      promise,
      new Promise<typeof TIMED_OUT>(resolve => {
        timer = setTimeout(() => resolve(TIMED_OUT), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  };

  /**
   * How many times each key has been set or removed, so a save that
   * finishes encrypting after a later set or remove (logging out right after
   * logging in) writes nothing.
   */
  const changes = new Map<string, number>();
  const changed = (key: string) =>
    changes.set(key, (changes.get(key) ?? 0) + 1);

  /** @param at the key's change count when `value` was current */
  const save = async (key: string, value: string, at = changes.get(key)) => {
    const encrypted = await encryption.encrypt(value);
    if (changes.get(key) === at) {
      store.setItem(DB, key, encrypted.toString('base64'));
    }
  };

  /**
   * Values waiting for the key store to open, by key: read back from here
   * meanwhile, and dropped if removed or replaced first.
   */
  const unsaved = new Map<string, string>();

  return {
    /**
     * The value, or null when there is none or it can't be decrypted any
     * more (the system's key changed), or the key store stays locked: the
     * user signs in again. A value whose key has been rotated is saved
     * again with the new one.
     */
    get: async (key: string): Promise<string | null> => {
      const waiting = unsaved.get(key);
      if (waiting !== undefined) {
        return waiting;
      }
      const at = changes.get(key);
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
          await save(key, result, at).catch(() => {});
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
     */
    set: async (key: string, value: string): Promise<void> => {
      changed(key);
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
        saving.catch((error: Error) =>
          console.error(`[secrets] not saved: ${error.message}`),
        );
      }
    },
    remove: async (key: string): Promise<void> => {
      changed(key);
      unsaved.delete(key);
      store.removeItem(DB, key);
    },
  };
};
