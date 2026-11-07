import {
  createMigrate,
  createTransform,
  MigrationManifest,
  PersistConfig,
} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'data/types/state';

/**
 * Bump this and add a matching entry to `migrations` whenever the shape of the
 * persisted root state changes. Stored state without a version is -1, so every
 * migration runs for installs that predate versioning.
 */
export const PERSIST_VERSION = 3;

/** Slices that track a request in flight next to the data they persist. */
export const slicesWithRequestState = [
  'assignments',
  'files',
] as const satisfies readonly (keyof AppState)[];

/** Per-request fields that only mean something while the app is running. */
const transientKeys = ['fetching', 'error'] as const;

function omitTransient<T extends object>(subState: T): T {
  const rest = { ...subState };
  for (const key of transientKeys) {
    delete (rest as Record<string, unknown>)[key];
  }
  return rest;
}

/**
 * Drops loading and error flags on the way to storage, so a request that was
 * in flight when the app was killed can't come back as a stuck spinner or a
 * stale error. Rehydration merges each slice over its initial state, which
 * fills them back in as idle.
 */
export const omitTransientTransform = createTransform<object, object>(
  omitTransient,
  null,
  { whitelist: [...slicesWithRequestState] },
);

type StoredState = Record<string, unknown> & { _persist: unknown };

export const migrations: MigrationManifest = {
  // v1: loading and error flags are no longer persisted. Strip them from
  // state saved by earlier versions, which kept them in every slice.
  1: state => {
    if (!state) {
      return state;
    }
    const next: StoredState = { ...state };
    for (const key of [
      ...slicesWithRequestState,
      'semesters',
      'courses',
      'notices',
    ]) {
      const slice = next[key];
      if (slice && typeof slice === 'object') {
        next[key] = omitTransient(slice);
      }
    }
    return next as typeof state;
  },
  // v2: semesters, courses and the user moved to the query cache, and the
  // semester being shown to data/userData, which read it before this ran.
  2: state => {
    if (!state) {
      return state;
    }
    const {
      semesters: _s,
      courses: _c,
      user: _u,
      ...next
    } = state as StoredState;
    return next as typeof state;
  },
  // v3: notices moved to the query cache.
  3: state => {
    if (!state) {
      return state;
    }
    const { notices: _n, ...next } = state as StoredState;
    return next as typeof state;
  },
};

export const rootPersistConfig: PersistConfig<AppState> = {
  key: 'root',
  version: PERSIST_VERSION,
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
  migrate: createMigrate(migrations),
  transforms: [omitTransientTransform],
  // Credentials, settings and the user's own data (favorites, archives,
  // hidden courses, course order) live in data/credentials, data/settings and
  // data/userData. Stored roots from 18.0.x still hold the user data in their
  // slices; data/legacy reads it once, before this store rehydrates, and the
  // reducers ignore it.
  blacklist: ['auth'],
};
