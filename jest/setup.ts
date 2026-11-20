import './common';

// React Native's runtime has the User Timing API (services/perf marks with
// it); the preset's stand-in for `performance` only has `now`.
if (!('mark' in performance)) {
  Object.assign(performance, { mark: jest.fn() });
}

// Modules every test gets a stand-in for: native modules, ESM-only packages
// and native views. Each stand-in is in jest/mocks/ and says what it does;
// jest/common.ts has the ones the Electron app's tests share.

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Native modules
jest.mock('expo-calendar', () => require('./mocks/expoCalendar'));
jest.mock('expo-file-system', () => require('./mocks/fileSystem'));
jest.mock('expo-notifications', () => require('./mocks/notifications'));
jest.mock('expo-secure-store', () => require('./mocks/secureStore'));
jest.mock('expo-sqlite/kv-store', () => require('./mocks/sqliteKvStore'));
jest.mock('expo-updates', () => require('./mocks/expoUpdates'));
jest.mock('expo-widgets', () => require('./mocks/widgets'));
jest.mock('../modules/menus', () => require('./mocks/menus'));
jest.mock('../modules/windows', () => require('./mocks/windows'));
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
// Spotlight and the App Intents' store are native only (iOS and Mac), as on
// Android.
jest.mock('../modules/spotlight', () => ({ __esModule: true, default: null }));
jest.mock('../modules/shortcuts', () => ({ __esModule: true, default: null }));
// The APK updater (Android's github flavor only); tests that install an
// update mock it themselves.
jest.mock('../modules/updater', () => ({ __esModule: true, default: null }));
// Startup reporting (Android only); services/perf's tests mock it themselves.
jest.mock('../modules/perf', () => ({ __esModule: true, default: null }));

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
jest.mock('../modules/quicklook', () => ({
  QuickLookView: require('react-native').View,
  isQuickLookAvailable: false,
  showQuickLookPanel: jest.fn(() => Promise.resolve()),
}));
