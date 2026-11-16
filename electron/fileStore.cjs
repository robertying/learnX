// Key-value storage as files: the stand-in for expo-sqlite's kv-store and
// expo-secure-store in the Electron app. Each database is a folder under the
// app's data folder and each key one file in it, written to a temporary file
// first and renamed over the old one, so a crash mid-write leaves the old value.
const fs = require('node:fs');
const path = require('node:path');

// Names Windows reserves for devices, with or without an extension.
const reserved = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * A key as a file name that's valid on Windows, macOS and Linux, and maps back
 * to the key: percent-encoded, with the characters Windows rejects or treats
 * specially (`*`, `.`) encoded too, and a device name's first letter escaped.
 * @param {string} key
 */
const fileName = key => {
  const encoded = encodeURIComponent(key).replace(
    /[*.!'()~]/g,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return reserved.test(encoded)
    ? `%${encoded.charCodeAt(0).toString(16).toUpperCase()}${encoded.slice(1)}`
    : encoded || '%';
};

/** @param {string} name */
const keyOf = name => (name === '%' ? '' : decodeURIComponent(name));

/** A database's name as a folder name, by the same rules as a key. */
const folderName = fileName;

/**
 * The databases under `root`.
 * @param {string} root
 */
const createFileStore = root => {
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
   * @param {string} db
   * @param {string} key
   * @param {string | Buffer} value
   */
  const setItem = (db, key, value) => {
    fs.mkdirSync(dir(db), { recursive: true });
    const file = path.join(dir(db), fileName(key));
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, value);
    fs.renameSync(temp, file);
  };

  /**
   * @param {string} db
   * @param {string} key
   */
  const removeItem = (db, key) => {
    fs.rmSync(path.join(dir(db), fileName(key)), { force: true });
  };

  /** @param {string} db */
  const clear = db => {
    fs.rmSync(dir(db), { recursive: true, force: true });
  };

  return { readAll, getItem, setItem, removeItem, clear };
};

module.exports = { createFileStore, fileName };
