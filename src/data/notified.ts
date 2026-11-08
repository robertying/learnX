import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';

export const NOTIFIED_KEY = 'notified';

/** Enough for a few semesters of items; the oldest are forgotten first. */
const MAX_KEYS = 3000;

/**
 * What the app has already notified the user about, by key, so a list that
 * goes back to an older state (a failed save, an item taken down and put
 * back) doesn't notify twice.
 */
export const useNotifiedStore = create<{ keys: string[] }>()(
  persist(() => ({ keys: [] as string[] }), {
    name: NOTIFIED_KEY,
    version: 1,
    storage: persistStorage,
  }),
);

export const getNotifiedKeys = () => new Set(useNotifiedStore.getState().keys);

export const addNotifiedKeys = (keys: string[]) => {
  if (keys.length === 0) {
    return;
  }
  useNotifiedStore.setState(state => {
    const added = new Set(keys);
    const kept = state.keys.filter(key => !added.has(key));
    return { keys: [...kept, ...added].slice(-MAX_KEYS) };
  });
};

export const resetNotified = () => {
  useNotifiedStore.setState({ keys: [] });
};
