// An in-memory keychain. Tests can read it through the mocked module's
// `__store` and clear it between cases.
const store = new Map<string, string>();

export const __store = store;
export const AFTER_FIRST_UNLOCK = 0;
export const getItemAsync = jest.fn(
  async (key: string) => store.get(key) ?? null,
);
export const setItemAsync = jest.fn(async (key: string, value: string) => {
  store.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string) => {
  store.delete(key);
});
