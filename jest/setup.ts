import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { mockClock, mockLocale } from './locale';

// As helpers/i18n does when it loads
dayjs.extend(relativeTime);

// Modules every test gets a stand-in for: native modules, ESM-only packages
// and native views. Each stand-in is in jest/mocks/ and says what it does.

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
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Native modules
jest.mock('expo-application', () => ({
  nativeBuildVersion: '1',
  applicationId: 'io.robertying.learnx',
}));
jest.mock('expo-calendar', () => require('./mocks/expoCalendar'));
jest.mock('expo-device', () => require('./mocks/device'));
jest.mock('expo-file-system', () => require('./mocks/fileSystem'));
jest.mock('expo-haptics', () => require('./mocks/haptics'));
jest.mock('expo-notifications', () => require('./mocks/notifications'));
jest.mock('expo-secure-store', () => require('./mocks/secureStore'));
jest.mock('expo-sqlite/kv-store', () => require('./mocks/sqliteKvStore'));
jest.mock('expo-updates', () => require('./mocks/expoUpdates'));
jest.mock('expo-widgets', () => require('./mocks/widgets'));
jest.mock('../modules/menus', () => require('./mocks/menus'));
// The system cookie store, empty.
jest.mock('@preeternal/react-native-cookie-manager', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({})),
    set: jest.fn(() => Promise.resolve(true)),
    setFromResponse: jest.fn(() => Promise.resolve(true)),
    clearByName: jest.fn(() => Promise.resolve(true)),
    clearAll: jest.fn(() => Promise.resolve(true)),
    clearAllStores: jest.fn(() => Promise.resolve(true)),
    flush: jest.fn(() => Promise.resolve()),
  },
}));
// Files shared to learnX (modules/share).
jest.mock('../modules/share', () => ({
  __esModule: true,
  default: {
    takeSharedItem: jest.fn(() => null),
    getSharedFilesDirectory: jest.fn(() => null),
    saveFile: jest.fn(() => Promise.resolve(true)),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
// Spotlight is native only (iOS and Mac), as on Android.
jest.mock('../modules/spotlight', () => ({ __esModule: true, default: null }));

// Native views
jest.mock('@expo/ui', () => require('./mocks/expoUi'));
jest.mock('@expo/ui/swift-ui', () => require('./mocks/expoSwiftUi'));
jest.mock('@expo/ui/swift-ui/modifiers', () =>
  require('./mocks/swiftUiModifiers'),
);
// The other entry points are ESM only. The widget layouts import them just for
// types (they are strings after the Babel transform), and any test that
// refreshes data updates the widget, so every test needs these.
jest.mock('@expo/ui/jetpack-compose', () => ({}));
jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({}));
jest.mock('expo-symbols', () => require('./mocks/symbols'));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () =>
  require('./mocks/swipeable'),
);
jest.mock('react-native-screens/experimental', () =>
  require('./mocks/screensExperimental'),
);
jest.mock('../modules/toast', () => require('./mocks/toast'));
