import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { mockClock, mockLocale } from '../locale';

// The `web` project's stand-ins: the Electron app's components render with
// React Native Web and Fluent UI into jsdom, so only the native modules the
// shared code they import touches are replaced.

dayjs.extend(relativeTime);

jest.mock('../../src/helpers/env', () => require('../mocks/env'));
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
jest.mock('expo-device', () => require('../mocks/device'));
jest.mock('expo-haptics', () => require('../mocks/haptics'));

// jsdom has no layout: Fluent's positioning and React Native Web's views
// observe sizes that never change.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, { ResizeObserver });

// What src/polyfills.web.js gives React Native Web in the app: Apple's color
// functions as CSS variables, and alerts as Fluent dialogs.
const ReactNativeWeb = require('react-native-web');
const {
  DynamicColorIOS,
  PlatformColor,
} = require('../../src/web/systemColors');
Object.assign(ReactNativeWeb, { DynamicColorIOS, PlatformColor });
ReactNativeWeb.Alert.alert = require('../../src/web/alert').Alert.alert;
