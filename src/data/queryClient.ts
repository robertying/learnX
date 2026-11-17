import { AppState } from 'react-native';
import { hashKey, QueryClient, type QueryKey } from '@tanstack/react-query';
import {
  experimental_createQueryPersister,
  PERSISTER_KEY_PREFIX,
} from '@tanstack/query-persist-client-core';
import { SQLiteStorage } from 'expo-sqlite/kv-store';
import { localizeCachedCourseNames } from 'data/courseNames';

/**
 * Bump to drop every cached response, e.g. when the shape the app keeps of a
 * response changes.
 */
export const QUERY_CACHE_VERSION = '3';

/** How long a cached response may be shown before it must be fetched again. */
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

/**
 * Server responses live in their own SQLite key-value database, one entry per
 * query, so logging out can drop them all at once.
 */
const cache = new SQLiteStorage('queryCache');

const storage = {
  getItem: (key: string) => cache.getItemSync(key),
  setItem: (key: string, value: string) => {
    if (value) {
      cache.setItemSync(key, value);
    }
  },
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
  // A response is written a moment after it arrives. One whose query was
  // cleared in the meantime (a fetch that came back as the user logged out)
  // belongs to the old session: it serializes to nothing and isn't written.
  serialize: persisted =>
    queryClient.getQueryCache().get(persisted.queryHash)?.state ===
    persisted.state
      ? JSON.stringify(persisted)
      : '',
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
      // Code outside React (the background task, server actions, widgets)
      // reads the cache directly, so nothing is dropped while the app runs.
      gcTime: Infinity,
      // Failures surface right away; the login has its own retry, and the
      // timetable's weeks retry on their own.
      retry: false,
    },
  },
});

let restoring: Promise<void> | null = null;

/**
 * Loads every saved response into memory, so lists show their last data at
 * launch, before the login finishes, and offline. Course names follow the
 * app's language, which may have changed since they were fetched. Later calls
 * share the first.
 */
export const restoreQueryCache = () => {
  restoring ??= queryPersister
    .restoreQueries(queryClient)
    .then(() =>
      localizeCachedCourseNames(queryClient).forEach(key => saveQuerySoon(key)),
    )
    .catch(() => {});
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

/**
 * Forgets the responses whose keys `matches` picks, in memory and on disk,
 * except one a screen is showing or a fetch is filling. For responses nothing
 * will read again, so the saved data doesn't keep growing.
 */
export const forgetQueries = (matches: (queryKey: QueryKey) => boolean) => {
  const queryCache = queryClient.getQueryCache();
  for (const query of queryCache.findAll({
    predicate: q => matches(q.queryKey),
  })) {
    if (query.getObserversCount() > 0 || query.state.fetchStatus !== 'idle') {
      continue;
    }
    unsaved.delete(query.queryHash);
    queryCache.remove(query);
    // The persister's own key for the query.
    cache.removeItemSync(`${PERSISTER_KEY_PREFIX}-${query.queryHash}`);
  }
};

/** Forgets every response, in memory and on disk. */
export const clearQueryCache = () => {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  unsaved.clear();
  queryClient.clear();
  cache.clearSync();
};
