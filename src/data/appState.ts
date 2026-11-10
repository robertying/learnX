import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';

export const APP_STATE_KEY = 'appState';

/** What the user has already seen in the app, for the Settings badges. */
export interface AppState {
  /** The version whose changelog was last shown. */
  changelogSeenVersion: string | null;
  /** Course information sharing was opened once, so its badge is gone. */
  courseSharingSeen: boolean;
}

const initialAppState = (): AppState => ({
  changelogSeenVersion: null,
  courseSharingSeen: false,
});

export const useAppStateStore = create<AppState>()(
  persist(initialAppState, {
    name: APP_STATE_KEY,
    version: 1,
    storage: persistStorage,
  }),
);

export const useAppState = <T>(selector: (state: AppState) => T) =>
  useAppStateStore(selector);

export const setChangelogSeen = (version: string) => {
  useAppStateStore.setState({ changelogSeenVersion: version });
};

export const setCourseSharingSeen = () => {
  useAppStateStore.setState({ courseSharingSeen: true });
};

export const resetAppState = () => {
  useAppStateStore.setState(initialAppState(), true);
};
