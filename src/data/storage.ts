import Storage from 'expo-sqlite/kv-store';
import { createJSONStorage, StateStorage } from 'zustand/middleware';

/**
 * SQLite-backed key-value storage, used synchronously so a store has its saved
 * state as soon as it is created: no loading gate, and the background task
 * reads the same values as the UI.
 */
export const kvStorage: StateStorage<void> = {
  getItem: name => Storage.getItemSync(name),
  setItem: (name, value) => Storage.setItemSync(name, value),
  removeItem: name => {
    Storage.removeItemSync(name);
  },
};

/** JSON storage for zustand's `persist` middleware. */
export const persistStorage = createJSONStorage(() => kvStorage);
