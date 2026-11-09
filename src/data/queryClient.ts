import { AppState } from 'react-native';
import {
  hashKey,
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';
import { SQLiteStorage } from 'expo-sqlite/kv-store';
import { noteRequestError } from 'data/auth';

/**
 * Bump to drop every cached response, e.g. when the shape the app keeps of a
 * response changes.
 */
export const QUERY_CACHE_VERSION = '2';

/** How long a cached response may be shown before it must be fetched again. */
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

/**
 * Server responses live in their own SQLite key-value database, one entry per
 * query, so logging out can drop them all at once.
 */
const cache = new SQLiteStorage('queryCache');

const storage = {
  getItem: (key: string) => cache.getItemSync(key),
  setItem: (key: string, value: string) => cache.setItemSync(key, value),
  removeItem: (key: string) => {
    cache.removeItemSync(key);
  },
  entries: () =>
    cache
      .getAllKeysSync()
      .map((key): [string, string] => [key, cache.getItemSync(key) ?? '']),
};

export const queryPersister = experimental_createQueryPersister({
  storage,
  maxAge: MAX_AGE,
  buster: QUERY_CACHE_VERSION,
});

export const queryClient = new QueryClient({
  // A login turned down while refreshing ends the session (data/auth).
  queryCache: new QueryCache({ onError: noteRequestError }),
  mutationCache: new MutationCache({ onError: noteRequestError }),
  defaultOptions: {
    queries: {
      // Writes each response to storage once it arrives.
      persister: queryPersister.persisterFn,
      // Lists are refreshed on mount and by pull-to-refresh; a minute keeps
      // the tabs from refetching the same thing as they mount one by one.
      staleTime: 60 * 1000,
      // Non-hook readers (thunks, the background task) read the cache
      // directly, so nothing is dropped while the app runs.
      gcTime: Infinity,
      // Failures surface right away, as before; the login has its own retry.
      retry: false,
    },
  },
});

let restoring: Promise<void> | null = null;

/**
 * Loads every saved response into memory, so lists show their last data at
 * launch, before the login finishes, and offline. Later calls share the first.
 */
export const restoreQueryCache = () => {
  restoring ??= queryPersister.restoreQueries(queryClient).catch(() => {});
  return restoring;
};

/** How long a small change waits for others before its list is saved. */
const SAVE_DELAY_MS = 1000;

/** Lists changed in place and not saved yet, by query hash. */
const unsaved = new Map<string, QueryKey>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Saves the lists changed in place since the last save. */
export const saveChangedQueries = () => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const keys = [...unsaved.values()];
  unsaved.clear();
  return Promise.all(
    keys.map(key =>
      queryPersister.persistQueryByKey(key, queryClient).catch(() => {}),
    ),
  );
};

/**
 * Saves a list changed in place (an item marked read or favorited) a moment
 * later. A list is saved whole, with every notice's text, so changes made
 * close together share one write, and the JS thread isn't held for each.
 * Saved at once when the app leaves the foreground. If the app is killed
 * first, the next fetch brings the server's state, with the waiting actions
 * laid over it.
 */
export const saveQuerySoon = (queryKey: QueryKey) => {
  unsaved.set(hashKey(queryKey), queryKey);
  saveTimer ??= setTimeout(saveChangedQueries, SAVE_DELAY_MS);
};

AppState.addEventListener('change', state => {
  if (state !== 'active' && unsaved.size > 0) {
    void saveChangedQueries();
  }
});

/** Forgets every response, in memory and on disk. */
export const clearQueryCache = () => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  unsaved.clear();
  queryClient.clear();
  cache.clearSync();
};
