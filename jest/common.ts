// What every project's tests run with, whatever renders them (jest/setup.ts
// for the phones, jest/web/setup.ts for the Electron app): the platform and
// clock the shared code reads, and the stand-ins for the native modules it
// imports on every platform.
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { mockClock, mockLocale } from './locale';

// Code that reads process.platform (the Electron app's main process) runs as
// on CI's Linux runners on every machine, as process.env.TZ in jest.config.js
// does for time zones: a test that needs another platform sets it itself.
Object.defineProperty(process, 'platform', { value: 'linux' });

// As helpers/i18n does when it loads
dayjs.extend(relativeTime);

// helpers/env inlines the repo's .env at build time (babel/inline-env.js); tests
// use fixed fixture values instead. Mocked by path so it covers every import
// specifier module-resolver produces ('helpers/env', './env', '../helpers/env').
jest.mock('../src/helpers/env', () => require('./mocks/env'));

jest.mock('expo-localization', () => ({
  getCalendars: () => [{ uses24hourClock: mockClock.uses24hourClock }],
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

jest.mock('expo-application', () => ({
  nativeBuildVersion: '1',
  applicationId: 'io.robertying.learnx',
}));
jest.mock('expo-device', () => require('./mocks/device'));
jest.mock('expo-haptics', () => require('./mocks/haptics'));
