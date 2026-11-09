// In-memory SQLite key-value stores. Tests can read the default one through
// the mocked module's `__store` and clear it between cases.
export class SQLiteStorage {
  __store = new Map<string, string>();
  getItemSync = jest.fn((key: string) => this.__store.get(key) ?? null);
  setItemSync = jest.fn((key: string, value: string) => {
    this.__store.set(key, value);
  });
  removeItemSync = jest.fn((key: string) => this.__store.delete(key));
  getAllKeysSync = jest.fn(() => [...this.__store.keys()]);
  clearSync = jest.fn(() => {
    this.__store.clear();
    return true;
  });
}

const storage = new SQLiteStorage();

export default storage;
export const Storage = storage;
