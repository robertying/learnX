import AsyncStorage from '@react-native-async-storage/async-storage';
import { legacy_createStore as createStore } from 'redux';
import { persistReducer, persistStore } from 'redux-persist';
import { FailReason } from 'thu-learn-lib';
import { migrations, PERSIST_VERSION, rootPersistConfig } from 'data/persist';
import { rootReducer } from 'data/reducers/root';
import { PersistAppState } from 'data/types/state';

const ROOT_KEY = 'persist:root';

/** redux-persist stores each slice as its own JSON string inside the root. */
const serialize = (state: Record<string, unknown>) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(state).map(([key, value]) => [key, JSON.stringify(value)]),
    ),
  );

const readStored = async () => {
  const raw = await AsyncStorage.getItem(ROOT_KEY);
  const outer: Record<string, string> = JSON.parse(raw!);
  return Object.fromEntries(
    Object.entries(outer).map(([key, value]) => [key, JSON.parse(value)]),
  );
};

/**
 * Builds a fresh store with the app's root persist config, as on app launch,
 * and waits for it to rehydrate.
 */
const launch = async () => {
  const store = createStore(
    persistReducer(rootPersistConfig, rootReducer as never),
  );
  const persistor = persistStore(store);
  await new Promise<void>(resolve => {
    const check = () => {
      if (persistor.getState().bootstrapped) {
        unsubscribe();
        resolve();
      }
    };
    const unsubscribe = persistor.subscribe(check);
    check();
  });
  return {
    getState: () => store.getState() as PersistAppState,
    dispatch: store.dispatch,
    persistor,
  };
};

const legacySlice = (extra: Record<string, unknown> = {}) => ({
  fetching: true,
  error: FailReason.NOT_LOGGED_IN,
  favorites: ['id-1'],
  archived: [],
  items: [],
  ...extra,
});

beforeEach(async () => {
  // redux-persist arms a never-cleared 5 s timeout per persisted key; fake
  // timers keep those from holding Jest open after the run.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('persisted root state', () => {
  it('migrates state saved before versioning and drops stuck requests', async () => {
    await AsyncStorage.setItem(
      ROOT_KEY,
      serialize({
        semesters: {
          fetching: true,
          error: FailReason.NOT_LOGGED_IN,
          items: ['2025-2026-1'],
          current: '2025-2026-1',
        },
        courses: legacySlice({ hidden: ['c1'], names: {}, order: ['c1'] }),
        notices: legacySlice(),
        assignments: legacySlice(),
        files: legacySlice(),
        user: { name: 'Student', department: 'CS' },
        _persist: { version: -1, rehydrated: true },
      }),
    );

    const { getState } = await launch();
    const state = getState();

    expect(state.files.fetching).toBe(false);
    expect(state.files.error ?? null).toBeNull();
    // Moved to the query cache and data/userData.
    expect(state).not.toHaveProperty('semesters');
    expect(state).not.toHaveProperty('courses');
    expect(state).not.toHaveProperty('user');
    expect(state).not.toHaveProperty('notices');
    expect(state).not.toHaveProperty('assignments');
    expect(state._persist.version).toBe(PERSIST_VERSION);
  });

  it('does not write loading or error flags to storage', async () => {
    const { getState, dispatch, persistor } = await launch();
    dispatch({ type: 'GET_ALL_FILES_FOR_COURSES_REQUEST' } as never);
    expect(getState().files.fetching).toBe(true);

    await persistor.flush();
    const stored = await readStored();

    expect(stored.files).not.toHaveProperty('fetching');
    expect(stored.files).not.toHaveProperty('error');
    expect(stored.files).toHaveProperty('items');
    expect(stored._persist.version).toBe(PERSIST_VERSION);
  });

  it('has a migration for every version up to the current one', () => {
    for (let version = 1; version <= PERSIST_VERSION; version++) {
      expect(migrations[version]).toBeInstanceOf(Function);
    }
  });
});
