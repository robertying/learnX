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

jest.mock('redux-persist-expo-securestore', () => () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
