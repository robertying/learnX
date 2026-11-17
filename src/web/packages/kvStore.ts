import { bridge } from 'web/bridge';

/**
 * Stands in for expo-sqlite's kv-store in the Electron app: each database is
 * a folder of files in the app's data folder (electron/fileStore.cjs). It's
 * read once, synchronously, when first used, and kept in memory; writes go to
 * the main process in order without waiting, so the sync calls stay sync.
 */
export class SQLiteStorage {
  private items: Map<string, string> | null = null;

  constructor(private readonly databaseName: string) {}

  private get loaded() {
    this.items ??= new Map(
      Object.entries(bridge().storage.load(this.databaseName)),
    );
    return this.items;
  }

  getItemSync(key: string): string | null {
    return this.loaded.get(key) ?? null;
  }

  setItemSync(key: string, value: string) {
    this.loaded.set(key, value);
    bridge().storage.set(this.databaseName, key, value);
  }

  removeItemSync(key: string) {
    const existed = this.loaded.delete(key);
    bridge().storage.remove(this.databaseName, key);
    return existed;
  }

  getAllKeysSync() {
    return [...this.loaded.keys()];
  }

  clearSync() {
    this.loaded.clear();
    bridge().storage.clear(this.databaseName);
    return true;
  }

  async getItem(key: string) {
    return this.getItemSync(key);
  }

  async setItem(key: string, value: string) {
    this.setItemSync(key, value);
  }

  async removeItem(key: string) {
    return this.removeItemSync(key);
  }

  async getAllKeys() {
    return this.getAllKeysSync();
  }

  async clear() {
    return this.clearSync();
  }
}

/** expo-sqlite's default database name. */
const Storage = new SQLiteStorage('ExpoSQLiteStorage');
export default Storage;
