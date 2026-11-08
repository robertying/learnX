import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { mockLocale } from './locale';

// As App.tsx does at startup
dayjs.extend(relativeTime);

// helpers/env inlines the repo's .env at build time via babel preval; tests
// use fixed fixture values instead. Mocked by path so it covers every import
// specifier module-resolver produces ('helpers/env', './env', '../helpers/env').
jest.mock('../src/helpers/env', () => require('./env'));

jest.mock('expo-localization', () => ({
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

// In-memory SQLite key-value stores. Tests can read the default one through
// the mocked module's `__store` and clear it between cases.
jest.mock('expo-sqlite/kv-store', () => {
  class SQLiteStorage {
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
  return {
    __esModule: true,
    default: storage,
    Storage: storage,
    SQLiteStorage,
  };
});

jest.mock('expo-calendar', () => require('./expoCalendar'));

// Widgets need the native module; each createWidget returns mocked methods.
jest.mock('expo-widgets', () => ({
  createWidget: jest.fn(() => ({
    updateSnapshot: jest.fn(),
    updateTimeline: jest.fn(),
    reload: jest.fn(),
  })),
}));

// Spotlight is native only (iOS and Mac), as on Android.
jest.mock('../modules/spotlight', () => ({ __esModule: true, default: null }));

// Notifications need the native module; tests read what was scheduled.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: false, canAskAgain: true }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, canAskAgain: true }),
  ),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  useLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
}));

jest.mock('@react-native-vector-icons/material-design-icons', () =>
  require('./icons'),
);

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () =>
  require('./swipeable'),
);

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
}));

// An iPhone
jest.mock('expo-device', () => ({
  DeviceType: { UNKNOWN: 0, PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 },
  deviceType: 1,
  modelName: 'iPhone',
  osName: 'iOS',
  osVersion: '26.0',
  supportedCpuArchitectures: ['arm64'],
}));
jest.mock('expo-application', () => ({ nativeBuildVersion: '1' }));

// @expo/ui renders SwiftUI / Jetpack Compose; tests get plain views.
jest.mock('@expo/ui', () => require('./expoUi'));
jest.mock('@expo/ui/swift-ui', () => require('./expoSwiftUi'));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  background: jest.fn(),
  buttonStyle: jest.fn(),
  disabled: jest.fn(),
  font: jest.fn(),
  foregroundStyle: jest.fn(),
  frame: jest.fn(),
  headerProminence: jest.fn(),
  labelsHidden: jest.fn(),
  listRowBackground: jest.fn(),
  pickerStyle: jest.fn(),
  refreshable: jest.fn(),
  scrollContentBackground: jest.fn(),
  tag: jest.fn(),
  toggleStyle: jest.fn(),
}));
// The other entry points are ESM only. The widget layouts import them just for
// types (they are strings after the Babel transform), and any test that
// refreshes data updates the widget, so every test needs these.
jest.mock('@expo/ui/jetpack-compose', () => ({}));
jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({}));

// The toast's UIKit views: plain views, the symbol findable as `icon-<name>`.
jest.mock('../modules/toast', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    ToastBackground: View,
    ToastSymbol: ({ name }: { name: string }) =>
      createElement(View, { testID: `icon-${name}` }),
  };
});

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// expo-file-system ships ESM only. An empty file system: nothing exists and
// writes do nothing, enough for modules that keep files (submission drafts).
jest.mock('expo-file-system', () => {
  class Entry {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts
        .map(part => (typeof part === 'string' ? part : part.uri))
        .join('/')
        .replace(/(?<!:)\/{2,}/g, '/');
    }
    get exists() {
      return false;
    }
    create() {}
    delete() {}
    async copy() {}
  }
  return {
    File: Entry,
    Directory: Entry,
    Paths: {
      document: new Entry('file:///document/'),
      cache: new Entry('file:///cache/'),
    },
  };
});

// The native menu module isn't in Jest (and `expo` is ESM). Without it, cards
// render their content without a context menu, and menu commands never fire.
jest.mock('../modules/menus', () => ({
  Menus: null,
  ContextMenuView: ({ children }: { children: React.ReactNode }) => children,
}));
