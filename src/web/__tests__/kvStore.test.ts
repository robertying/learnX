import Storage, { SQLiteStorage } from 'web/kvStore';
import type { Bridge } from 'web/bridge';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

let bridge: Bridge;

beforeEach(() => {
  bridge = installBridge();
  jest.mocked(bridge.storage.load).mockReturnValue({ saved: 'value' });
});

afterEach(uninstallBridge);

it('reads a database once, when first used', () => {
  const store = new SQLiteStorage('queryCache');
  expect(bridge.storage.load).not.toHaveBeenCalled();
  expect(store.getItemSync('saved')).toBe('value');
  expect(store.getItemSync('missing')).toBeNull();
  expect(bridge.storage.load).toHaveBeenCalledTimes(1);
  expect(bridge.storage.load).toHaveBeenCalledWith('queryCache');
});

it('writes through to the main process and keeps the value', () => {
  const store = new SQLiteStorage('db');
  store.setItemSync('key', 'one');
  expect(store.getItemSync('key')).toBe('one');
  expect(bridge.storage.set).toHaveBeenCalledWith('db', 'key', 'one');

  expect(store.removeItemSync('key')).toBe(true);
  expect(store.removeItemSync('key')).toBe(false);
  expect(store.getItemSync('key')).toBeNull();
  expect(bridge.storage.remove).toHaveBeenCalledWith('db', 'key');
});

it('lists and clears the keys', () => {
  const store = new SQLiteStorage('db');
  store.setItemSync('other', '1');
  expect(store.getAllKeysSync()).toEqual(['saved', 'other']);
  expect(store.clearSync()).toBe(true);
  expect(store.getAllKeysSync()).toEqual([]);
  expect(bridge.storage.clear).toHaveBeenCalledWith('db');
});

it('offers the same calls asynchronously', async () => {
  const store = new SQLiteStorage('db');
  await store.setItem('key', 'two');
  expect(await store.getItem('key')).toBe('two');
  expect(await store.getAllKeys()).toEqual(['saved', 'key']);
  expect(await store.removeItem('key')).toBe(true);
  expect(await store.clear()).toBe(true);
  expect(await store.getAllKeys()).toEqual([]);
});

it("uses expo-sqlite's default database by default", () => {
  Storage.getItemSync('saved');
  expect(bridge.storage.load).toHaveBeenCalledWith('ExpoSQLiteStorage');
});
