import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  RENAME_RETRY_MS,
  createFileStore,
  fileName,
  loggedWrites,
} from '../fileStore.ts';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-file-store-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('fileName', () => {
  it.each([
    ['settings', 'settings'],
    ['persist:auth', 'persist%3Aauth'],
    ['["content","notices"]', '%5B%22content%22%2C%22notices%22%5D'],
    ['a*b.c', 'a%2Ab%2Ec'],
    ["it's (x)!~", 'it%27s%20%28x%29%21%7E'],
    ['CON', '%43%4F%4E'],
    // Keys that differ only in case get names that differ in more than case.
    ['queryKey', 'query%4Bey'],
    ['querykey', 'querykey'],
    ['日程', '%E6%97%A5%E7%A8%8B'],
    ['com1', '%63om1'],
    ['console', 'console'],
    ['', '%'],
  ])('names %j as %j', (key, name) => {
    expect(fileName(key)).toBe(name);
  });
});

it('keeps values by database and key, across stores', () => {
  const store = createFileStore(root);
  expect(store.readAll('db')).toEqual({});
  expect(store.getItem('db', 'missing')).toBeNull();

  store.setItem('db', 'persist:auth', '{"a":1}');
  store.setItem('db', 'CON', 'device name');
  store.setItem('db', '', 'empty key');
  store.setItem('other', 'persist:auth', 'elsewhere');

  const reopened = createFileStore(root);
  expect(reopened.readAll('db')).toEqual({
    'persist:auth': '{"a":1}',
    CON: 'device name',
    '': 'empty key',
  });
  expect(reopened.getItem('other', 'persist:auth')).toBe('elsewhere');
});

it('replaces, removes and clears', () => {
  const store = createFileStore(root);
  store.setItem('db', 'k', 'one');
  store.setItem('db', 'k', 'two');
  expect(store.getItem('db', 'k')).toBe('two');
  store.removeItem('db', 'k');
  store.removeItem('db', 'never written');
  expect(store.getItem('db', 'k')).toBeNull();
  store.setItem('db', 'k', 'three');
  store.clear('db');
  expect(store.readAll('db')).toEqual({});
});

it('skips a write left unfinished', () => {
  const store = createFileStore(root);
  store.setItem('db', 'k', 'saved');
  fs.writeFileSync(path.join(root, 'db', 'k.tmp'), 'half');
  expect(store.readAll('db')).toEqual({ k: 'saved' });
});

describe('a rename Windows refuses while the file is busy', () => {
  const busy = (code: string) =>
    Object.assign(new Error(`${code}: operation not permitted`), { code });

  /** A store whose renames fail with `codes`, one per try, then work. */
  const busyStore = (codes: string[]) => {
    jest.useFakeTimers();
    const log = jest.fn();
    const rename = jest.fn((from: string, to: string) => {
      const code = codes.shift();
      if (code) {
        throw busy(code);
      }
      fs.renameSync(from, to);
    });
    const store = createFileStore(root, {
      rename,
      timers: { setTimeout, clearTimeout },
      log,
    });
    return { store, rename, log };
  };
  afterEach(() => jest.useRealTimers());

  it('is tried again later, without blocking, with the newest value', () => {
    const { store, rename } = busyStore(['EPERM', 'EBUSY']);
    store.setItem('settings', 'theme', 'dark');
    // Returned at once; the old value (none) stays until the rename works.
    expect(store.getItem('settings', 'theme')).toBeNull();
    store.setItem('settings', 'theme', 'light');
    expect(rename).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(RENAME_RETRY_MS[0]);
    expect(store.getItem('settings', 'theme')).toBeNull();
    jest.advanceTimersByTime(RENAME_RETRY_MS[1]);
    expect(store.getItem('settings', 'theme')).toBe('light');
    expect(rename).toHaveBeenCalledTimes(3);
  });

  it('gives up after a while, and says so', () => {
    const { store, log } = busyStore(
      Array.from({ length: RENAME_RETRY_MS.length + 1 }, () => 'EACCES'),
    );
    store.setItem('settings', 'theme', 'dark');
    jest.runAllTimers();
    expect(store.getItem('settings', 'theme')).toBeNull();
    expect(log).toHaveBeenCalledWith('theme not saved: EACCES');
  });

  it('throws at once on another error', () => {
    const { store } = busyStore(['ENOSPC']);
    expect(() => store.setItem('settings', 'theme', 'dark')).toThrow('ENOSPC');
  });

  it('stops when the key is removed or its database cleared', () => {
    const { store, rename } = busyStore(['EPERM', 'EPERM']);
    store.setItem('settings', 'theme', 'dark');
    store.removeItem('settings', 'theme');
    store.setItem('settings', 'font', 'big');
    store.clear('settings');
    jest.runAllTimers();
    expect(rename).toHaveBeenCalledTimes(2);
    expect(store.readAll('settings')).toEqual({});
  });
});

describe('loggedWrites', () => {
  it('writes through, and logs a failed write instead of throwing', () => {
    const store = createFileStore(root);
    const log = jest.fn();
    const writes = loggedWrites(store, log);
    writes.setItem('settings', 'theme', 'dark');
    expect(store.getItem('settings', 'theme')).toBe('dark');
    writes.removeItem('settings', 'theme');
    expect(store.getItem('settings', 'theme')).toBeNull();
    writes.setItem('settings', 'theme', 'light');
    writes.clear('settings');
    expect(store.readAll('settings')).toEqual({});
    expect(log).not.toHaveBeenCalled();

    // A folder where the value's file would go: the rename fails.
    fs.mkdirSync(path.join(root, 'settings', 'theme'), { recursive: true });
    fs.writeFileSync(path.join(root, 'settings', 'theme', 'x'), '');
    expect(() => writes.setItem('settings', 'theme', 'dark')).not.toThrow();
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^setItem\(settings\) failed: /),
    );
  });
});
