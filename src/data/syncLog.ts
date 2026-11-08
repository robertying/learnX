import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';

export const SYNC_LOG_KEY = 'syncLog';

/** Enough to see how long syncs take over a few days. */
const MAX_RUNS = 20;

export type SyncListName = 'assignments' | 'notices' | 'files';

/** One run of background sync. */
export interface SyncRun {
  /** When it started, in ms since the epoch. */
  startedAt: number;
  /** How long it took, in ms, from start to the lists being saved. */
  duration: number;
  status: 'skipped' | 'failed' | 'synced';
  /** Courses whose list came back, of those it tried, per list. */
  courses?: Record<SyncListName, { fetched: number; total: number }>;
  /** It ran out of time before every course came back. */
  timedOut?: boolean;
  /** Started by hand in a debug build rather than by the system. */
  manual?: boolean;
}

/** The latest background syncs, oldest first. */
export const useSyncLogStore = create<{ runs: SyncRun[] }>()(
  persist(() => ({ runs: [] as SyncRun[] }), {
    name: SYNC_LOG_KEY,
    version: 1,
    storage: persistStorage,
  }),
);

export const addSyncRun = (run: SyncRun) => {
  useSyncLogStore.setState(state => ({
    runs: [...state.runs, run].slice(-MAX_RUNS),
  }));
};

export const resetSyncLog = () => {
  useSyncLogStore.setState({ runs: [] });
};

/** One line for a run, e.g. `synced in 12.3 s, assignments 6/8, out of time`. */
export const describeSyncRun = (run: SyncRun) => {
  const parts = [`${run.status} in ${(run.duration / 1000).toFixed(1)} s`];
  if (run.courses) {
    for (const [name, { fetched, total }] of Object.entries(run.courses)) {
      if (fetched < total) {
        parts.push(`${name} ${fetched}/${total}`);
      }
    }
  }
  if (run.timedOut) {
    parts.push('out of time');
  }
  return parts.join(', ');
};
