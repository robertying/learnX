import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createFileStore,
  fileName,
  loggedWrites,
  renameRetrying,
} from '../fileStore.cjs';

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

describe('renameRetrying', () => {
  const busy = (code: string) =>
    Object.assign(new Error(`${code}: operation not permitted`), { code });

  it('tries again while the target is busy', () => {
    const rename = jest
      .fn()
      .mockImplementationOnce(() => {
        throw busy('EPERM');
      })
      .mockImplementationOnce(() => {
        throw busy('EBUSY');
      })
      .mockImplementationOnce(() => {});
    const sleep = jest.fn();
    renameRetrying('a.tmp', 'a', { rename, sleep });
    expect(rename).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[10], [20]]);
  });

  it('gives up after a while, and at once on another error', () => {
    const sleep = jest.fn();
    expect(() =>
      renameRetrying('a.tmp', 'a', {
        rename: () => {
          throw busy('EACCES');
        },
        sleep,
      }),
    ).toThrow('EACCES');
    expect(sleep).toHaveBeenCalledTimes(6);

    sleep.mockClear();
    expect(() =>
      renameRetrying('a.tmp', 'a', {
        rename: () => {
          throw busy('ENOSPC');
        },
        sleep,
      }),
    ).toThrow('ENOSPC');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('waits for real by default', () => {
    const rename = jest
      .fn()
      .mockImplementationOnce(() => {
        throw busy('EPERM');
      })
      .mockImplementationOnce(() => {});
    const started = Date.now();
    renameRetrying('a.tmp', 'a', { rename });
    expect(Date.now() - started).toBeGreaterThanOrEqual(9);
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
