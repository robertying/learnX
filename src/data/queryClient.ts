import { QueryClient } from '@tanstack/react-query';
import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';
import { SQLiteStorage } from 'expo-sqlite/kv-store';

/**
 * Bump to drop every cached response, e.g. when the shape the app keeps of a
 * response changes.
 */
export const QUERY_CACHE_VERSION = '1';

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

/** Forgets every response, in memory and on disk. */
export const clearQueryCache = () => {
  queryClient.clear();
  cache.clearSync();
};
