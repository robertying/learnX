import { mockLocale } from './locale';

// helpers/env inlines the repo's .env at build time via babel preval; tests
// use fixed fixture values instead. Mocked by path so it covers every import
// specifier module-resolver produces ('helpers/env', './env', '../helpers/env').
jest.mock('../src/helpers/env', () => require('./env'));

jest.mock('react-native-localize', () => ({
  getLocales: () => [
    {
      languageTag: mockLocale.current,
      languageCode: mockLocale.current.split('-')[0],
      isRTL: false,
    },
  ],
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// An in-memory keychain. Tests can read it through the mocked module's
// `__store` and clear it between cases.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

// An in-memory SQLite key-value store. Tests can read it through the mocked
// module's `__store` and clear it between cases.
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  const storage = {
    __store: store,
    getItemSync: jest.fn((key: string) => store.get(key) ?? null),
    setItemSync: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItemSync: jest.fn((key: string) => store.delete(key)),
  };
  return { __esModule: true, default: storage, Storage: storage };
});
