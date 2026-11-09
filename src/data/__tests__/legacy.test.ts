type Modules = {
  kv: Map<string, string>;
  AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;
  legacy: typeof import('data/legacy');
  settings: typeof import('data/settings');
  userData: typeof import('data/userData');
};

/**
 * Starts the app's data modules from scratch, as on a launch, with the given
 * device storage. The stores read the key-value store when they are created.
 */
const launch = async ({
  kv = {},
  asyncStorage = {},
}: {
  kv?: Record<string, string>;
  asyncStorage?: Record<string, string>;
} = {}): Promise<Modules> => {
  jest.resetModules();
  const kvStore: Map<string, string> = require('expo-sqlite/kv-store').default
    .__store;
  for (const [key, value] of Object.entries(kv)) {
    kvStore.set(key, value);
  }
  const asyncStorageModule = require('@react-native-async-storage/async-storage');
  const AsyncStorage = asyncStorageModule.default ?? asyncStorageModule;
  await AsyncStorage.multiSet(Object.entries(asyncStorage));
  return {
    kv: kvStore,
    AsyncStorage,
    legacy: require('data/legacy'),
    settings: require('data/settings'),
    userData: require('data/userData'),
  };
};

/** How redux-persist wrote a persisted reducer: every value JSON-encoded. */
const serialize = (state: Record<string, unknown>) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(state).map(([key, value]) => [key, JSON.stringify(value)]),
    ),
  );

/** Settings as 18.0.3 saved them under `persist:settings`. */
const legacySettings = serialize({
  assignmentCalendarSync: true,
  assignmentReminderSync: false,
  assignmentCalendarId: 'cal-1',
  syncedCalendarAssignments: { a1: 'e1', a2: 'e2' },
  syncedReminderAssignments: {},
  courseCalendarId: 'cal-2',
  calendarEventLength: 45,
  graduate: true,
  fileUseDocumentDir: true,
  fileOmitCourseName: false,
  tabFilterSelections: {
    notice: 'fav',
    assignment: 'all',
    file: 'unread',
    course: 'hidden',
  },
  alarms: {
    courseAlarm: true,
    courseAlarmOffset: 15,
    assignmentCalendarSecondAlarm: false,
    assignmentCalendarAlarm: true,
    assignmentCalendarAlarmOffset: 60,
    assignmentCalendarNoAlarmIfComplete: true,
    assignmentReminderAlarm: false,
  },
  courseInformationSharing: true,
  courseInformationSharingBadgeShown: true,
  lastShowChangelogVersion: '18.0.3',
  openFileAfterDownload: true,
  courseEventOmitLocation: false,
  _persist: { version: -1, rehydrated: true },
});

const slice = (extra: Record<string, unknown>) => ({
  items: [{ id: 'item' }],
  ...extra,
});

/** The root as 18.0.3 saved it under `persist:root`. */
const legacyRoot = serialize({
  semesters: { items: ['2025-2026-1'], current: '2025-2026-1' },
  courses: slice({
    hidden: ['c3'],
    order: ['c2', 'c1'],
    names: {},
  }),
  notices: slice({ favorites: ['n1', 'n2'], archived: ['n2'] }),
  assignments: slice({ favorites: ['a1', 'a1'], archived: [] }),
  files: slice({ favorites: [], archived: ['f1'] }),
  user: { name: 'Student', department: 'CS' },
  _persist: { version: 1, rehydrated: true },
});

/** data/login, talking to the emulated server instead of the real one. */
const loginModule = (): typeof import('data/login') => {
  jest.doMock('data/source', () => ({
    dataSource: require('data/mockSource').mockSource,
  }));
  return require('data/login');
};

const upgraded = {
  'persist:root': legacyRoot,
  'persist:settings': legacySettings,
};

/** Favorites from 18.0.x are queued to be added on the website. */
const favorite = (type: string, id: string) =>
  expect.objectContaining({ kind: 'favorite', type, id, flag: true });

describe('importing user data saved by 18.0.x', () => {
  it('moves settings, favorites, archives, hidden courses, order and semester', async () => {
    const m = await launch({ asyncStorage: upgraded });
    await m.legacy.importLegacyUserData();

    expect(m.settings.getSettings()).toEqual({
      ...m.settings.defaultSettings,
      assignmentCalendarSync: true,
      assignmentCalendarId: 'cal-1',
      syncedCalendarAssignments: { a1: 'e1', a2: 'e2' },
      courseCalendarId: 'cal-2',
      calendarEventLength: 45,
      graduate: true,
      fileUseDocumentDir: true,
      tabFilterSelections: {
        notice: 'fav',
        assignment: 'all',
        file: 'unread',
        course: 'hidden',
      },
      alarms: {
        courseAlarm: true,
        courseAlarmOffset: 15,
        assignmentCalendarSecondAlarm: false,
        assignmentCalendarAlarm: true,
        assignmentCalendarAlarmOffset: 60,
        assignmentCalendarNoAlarmIfComplete: true,
        assignmentReminderAlarm: false,
      },
      courseInformationSharing: true,
      courseInformationSharingBadgeShown: true,
      lastShowChangelogVersion: '18.0.3',
      openFileAfterDownload: true,
    });
    expect(m.userData.getUserData()).toEqual({
      pendingActions: [
        favorite('notice', 'n1'),
        favorite('notice', 'n2'),
        favorite('assignment', 'a1'),
      ],
      archived: { notice: ['n2'], assignment: [], file: ['f1'] },
      hiddenCourses: ['c3'],
      courseOrder: ['c2', 'c1'],
      currentSemester: '2025-2026-1',
      latestSemester: null,
    });
  });

  it('survives the next launch and deletes the legacy data', async () => {
    const first = await launch({ asyncStorage: upgraded });
    await first.legacy.importLegacyUserData();

    expect(await first.AsyncStorage.getItem('persist:settings')).toBeNull();
    // Its server data is fetched again into the query cache.
    expect(await first.AsyncStorage.getItem('persist:root')).toBeNull();

    const next = await launch({
      kv: Object.fromEntries(first.kv),
      asyncStorage: { 'persist:root': legacyRoot },
    });
    // Saved state is there before the import runs.
    expect(next.settings.getSettings().graduate).toBe(true);
    expect(next.userData.getUserData().hiddenCourses).toEqual(['c3']);
  });

  it('takes the semester from a root that an earlier build already imported', async () => {
    // That build imported everything but the semester being shown.
    const first = await launch({ asyncStorage: upgraded });
    await first.legacy.importLegacyUserData();
    first.userData.setArchived('notice', ['n2'], false);
    first.kv.set(
      'userData',
      first.kv
        .get('userData')!
        .replace('"currentSemester":"2025-2026-1"', '"currentSemester":null'),
    );

    const next = await launch({
      kv: Object.fromEntries(first.kv),
      asyncStorage: { 'persist:root': legacyRoot },
    });
    expect(next.userData.getUserData().currentSemester).toBeNull();
    await next.legacy.importLegacyUserData();
    expect(next.userData.getUserData().currentSemester).toBe('2025-2026-1');
    // The rest isn't imported again.
    expect(next.userData.getUserData().archived.notice).toEqual([]);
    expect(await next.AsyncStorage.getItem('persist:root')).toBeNull();
  });

  it('keeps a semester chosen since', async () => {
    const first = await launch({ asyncStorage: upgraded });
    await first.legacy.importLegacyUserData();
    first.userData.setCurrentSemester('2026-2027-1');

    const next = await launch({
      kv: Object.fromEntries(first.kv),
      asyncStorage: { 'persist:root': legacyRoot },
    });
    await next.legacy.importLegacyUserData();
    expect(next.userData.getUserData().currentSemester).toBe('2026-2027-1');
  });

  it('runs only once, so later changes are not overwritten', async () => {
    const first = await launch({ asyncStorage: upgraded });
    await first.legacy.importLegacyUserData();
    first.userData.setArchived('notice', ['n2'], false);
    first.settings.setSetting('graduate', false);

    const next = await launch({
      kv: Object.fromEntries(first.kv),
      asyncStorage: { 'persist:root': legacyRoot },
    });
    await next.legacy.importLegacyUserData();
    expect(next.userData.getUserData().archived.notice).toEqual([]);
    expect(next.settings.getSettings().graduate).toBe(false);
  });

  it('keeps the defaults on a fresh install', async () => {
    const m = await launch();
    await m.legacy.importLegacyUserData();
    expect(m.settings.getSettings()).toEqual(m.settings.defaultSettings);
    expect(m.userData.getUserData()).toEqual(m.userData.emptyUserData());
    expect(m.kv.get(m.legacy.LEGACY_IMPORTED_KEY)).toBe('1');
  });

  it('retries on the next call when reading the old data fails', async () => {
    const m = await launch({ asyncStorage: upgraded });
    jest
      .mocked(m.AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('disk'));

    await expect(m.legacy.importLegacyUserData()).resolves.toBeUndefined();
    expect(m.kv.has(m.legacy.LEGACY_IMPORTED_KEY)).toBe(false);
    expect(m.settings.getSettings().graduate).toBe(false);

    await m.legacy.importLegacyUserData();
    expect(m.settings.getSettings().graduate).toBe(true);
    expect(m.userData.getUserData().pendingActions).toEqual([
      favorite('notice', 'n1'),
      favorite('notice', 'n2'),
      favorite('assignment', 'a1'),
    ]);
  });

  it('skips values of the wrong type and keys that do not parse', async () => {
    const m = await launch({
      asyncStorage: {
        'persist:settings': JSON.stringify({
          graduate: '"yes"',
          calendarEventLength: '"45"',
          alarms: '[]',
          syncedCalendarAssignments: '{"a1":3}',
          lastShowChangelogVersion: 'null',
          fileUseDocumentDir: '{not json',
          openFileAfterDownload: 'true',
          newUpdate: 'true',
          unknownSetting: 'true',
        }),
        'persist:root': JSON.stringify({
          courses: '{"hidden":"c1","order":["c1",2]}',
          notices: '{"favorites":["n1"],"archived":null}',
          files: 'not json',
        }),
      },
    });
    await m.legacy.importLegacyUserData();

    expect(m.settings.getSettings()).toEqual({
      ...m.settings.defaultSettings,
      openFileAfterDownload: true,
    });
    expect(m.userData.getUserData()).toEqual({
      ...m.userData.emptyUserData(),
      pendingActions: [favorite('notice', 'n1')],
    });
  });

  it('is cleared with the rest on logout', async () => {
    const m = await launch({ asyncStorage: upgraded });
    // The import failed, so the legacy settings are still there.
    jest
      .mocked(m.AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error('disk'));
    await m.legacy.importLegacyUserData();

    const { logout } = loginModule();
    m.userData.setArchived('file', ['f9'], true);
    m.settings.setSetting('graduate', true);
    await logout();

    expect(await m.AsyncStorage.getItem('persist:settings')).toBeNull();
    expect(await m.AsyncStorage.getItem('persist:root')).toBeNull();
    expect(m.userData.getUserData()).toEqual(m.userData.emptyUserData());
    expect(m.settings.getSettings()).toEqual(m.settings.defaultSettings);
  });
});

describe('the mock account', () => {
  it('replaces the user data with its own', async () => {
    const m = await launch();
    m.userData.setArchived('notice', ['mine'], true);
    m.settings.setSetting('graduate', true);

    const { loginWithMockAccount } = loginModule();
    const { mockUserData } = require('data/mock');
    loginWithMockAccount('mock-user');

    expect(require('data/auth').getAuth().loggedIn).toBe(true);
    expect(m.userData.getUserData()).toEqual(mockUserData);
    expect(m.settings.getSettings()).toEqual(m.settings.defaultSettings);
  });
});
