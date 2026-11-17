// Key-value storage as files: the stand-in for expo-sqlite's kv-store and
// expo-secure-store in the Electron app. Each database is a folder under the
// app's data folder and each key one file in it, written to a temporary file
// first (and flushed to the disk) and renamed over the old one, so a crash
// mid-write leaves the old value.
const fs = require('node:fs');
const path = require('node:path');

// Names Windows reserves for devices, with or without an extension.
const reserved = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * How long a rename waits before each retry while the target is busy: about
 * five seconds in all, without blocking anything meanwhile.
 */
const RENAME_RETRY_MS = [20, 40, 80, 160, 320, 640, 1280, 2560];

/** Errors of a rename onto a file another program briefly holds (Windows). */
const BUSY = new Set(['EPERM', 'EBUSY', 'EACCES']);

/**
 * A key as a file name that's valid on Windows, macOS and Linux, and maps back
 * to the key: percent-encoded, with the characters Windows rejects or treats
 * specially (`*`, `.`) encoded too, and capital letters, so keys that differ
 * only in case don't share a file where names ignore case (NTFS, APFS); a
 * device name's first letter is escaped.
 * @param {string} key
 */
const fileName = key => {
  const encoded = Array.from(key, c =>
    /[A-Z*.!'()~]/.test(c)
      ? `%${c.charCodeAt(0).toString(16).toUpperCase()}`
      : encodeURIComponent(c),
  ).join('');
  return reserved.test(encoded)
    ? `%${encoded.charCodeAt(0).toString(16).toUpperCase()}${encoded.slice(1)}`
    : encoded || '%';
};

/** @param {string} name */
const keyOf = name => (name === '%' ? '' : decodeURIComponent(name));

/** A database's name as a folder name, by the same rules as a key. */
const folderName = fileName;

/**
 * The databases under `root`. A write's rename that Windows refuses while
 * another program briefly holds the file (Defender, the search indexer, a
 * backup tool) is tried again later, as graceful-fs does, without holding up
 * the main process; a newer write of the same key while it waits is what the
 * retry renames, and one given up on is logged.
 * @param {string} root
 * @param {{
 *   rename?: (from: string, to: string) => void;
 *   timers?: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
 *   log?: (message: string) => void;
 * }} [options]
 */
const createFileStore = (
  root,
  {
    rename = fs.renameSync,
    timers = { setTimeout, clearTimeout },
    log = () => {},
  } = {},
) => {
  /** @param {string} db */
  const dir = db => path.join(root, folderName(db));

  /**
   * Every key and value in a database.
   * @param {string} db
   * @returns {Record<string, string>}
   */
  const readAll = db => {
    /** @type {Record<string, string>} */
    const items = {};
    let names;
    try {
      names = fs.readdirSync(dir(db));
    } catch {
      return items;
    }
    for (const name of names) {
      if (name.endsWith('.tmp')) {
        continue;
      }
      items[keyOf(name)] = fs.readFileSync(path.join(dir(db), name), 'utf8');
    }
    return items;
  };

  /**
   * @param {string} db
   * @param {string} key
   * @returns {string | null}
   */
  const getItem = (db, key) => {
    try {
      return fs.readFileSync(path.join(dir(db), fileName(key)), 'utf8');
    } catch {
      return null;
    }
  };

  /**
   * Renames waiting to be tried again, by the file they'd replace.
   * @type {Map<string, ReturnType<typeof setTimeout>>}
   */
  const retrying = new Map();

  /** Stops a waiting rename, leaving its temporary file to whoever's next. */
  const stopRetrying = (/** @type {string} */ file) => {
    timers.clearTimeout(retrying.get(file));
    retrying.delete(file);
  };

  /**
   * Renames `file`'s temporary file over it, now or, while it's busy, later.
   * @param {string} file
   * @param {number} attempt
   */
  const commit = (file, attempt) => {
    const temp = `${file}.tmp`;
    try {
      rename(temp, file);
      retrying.delete(file);
    } catch (error) {
      const code = /** @type {NodeJS.ErrnoException} */ (error).code ?? '';
      if (!BUSY.has(code) || attempt >= RENAME_RETRY_MS.length) {
        retrying.delete(file);
        if (attempt === 0) {
          throw error;
        }
        log(`${path.basename(file)} not saved: ${code || String(error)}`);
        return;
      }
      retrying.set(
        file,
        timers.setTimeout(
          () => commit(file, attempt + 1),
          RENAME_RETRY_MS[attempt],
        ),
      );
    }
  };

  /**
   * @param {string} db
   * @param {string} key
   * @param {string | Buffer} value
   */
  const setItem = (db, key, value) => {
    fs.mkdirSync(dir(db), { recursive: true });
    const file = path.join(dir(db), fileName(key));
    const temp = `${file}.tmp`;
    const fd = fs.openSync(temp, 'w');
    try {
      fs.writeFileSync(fd, value);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    // A rename already waiting takes this value with it.
    if (!retrying.has(file)) {
      commit(file, 0);
    }
  };

  /**
   * @param {string} db
   * @param {string} key
   */
  const removeItem = (db, key) => {
    const file = path.join(dir(db), fileName(key));
    stopRetrying(file);
    fs.rmSync(`${file}.tmp`, { force: true });
    fs.rmSync(file, { force: true });
  };

  /** @param {string} db */
  const clear = db => {
    for (const file of retrying.keys()) {
      if (path.dirname(file) === dir(db)) {
        stopRetrying(file);
      }
    }
    fs.rmSync(dir(db), { recursive: true, force: true });
  };

  return { readAll, getItem, setItem, removeItem, clear };
};

/**
 * The page's writes (`storage:set`, `storage:remove`, `storage:clear`), which
 * it sends without waiting: one that fails is logged, never thrown, which
 * would be an uncaught error in the main process (Electron's error dialog).
 * The page's copy keeps the value until the next launch reads the files.
 * @param {ReturnType<typeof createFileStore>} store
 * @param {(message: string) => void} log
 */
const loggedWrites = (store, log) => {
  /**
   * @template {unknown[]} A
   * @param {string} name
   * @param {(...args: A) => void} write
   */
  const logged =
    (name, write) =>
    (/** @type {A} */ ...args) => {
      try {
        write(...args);
      } catch (error) {
        log(
          `${name}(${String(args[0])}) failed: ${/** @type {Error} */ (error).message}`,
        );
      }
    };
  return {
    setItem: logged('setItem', store.setItem),
    removeItem: logged('removeItem', store.removeItem),
    clear: logged('clear', store.clear),
  };
};

module.exports = {
  RENAME_RETRY_MS,
  createFileStore,
  fileName,
  loggedWrites,
};
