import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';
import semverGt from 'semver/functions/gt';

export const APP_STATE_KEY = 'appState';

/**
 * What the user has already seen in the app: for the Settings badges, and
 * the welcome, set-up and What's New pages (`helpers/whatsNew`).
 */
export interface AppState {
  /** The version whose changelog was last shown. */
  changelogSeenVersion: string | null;
  /** Course information sharing was opened once, so its badge is gone. */
  courseSharingSeen: boolean;
  /** The welcome page before the first login was closed. */
  welcomeSeen: boolean;
  /** The set-up page after the first login was closed, or skipped. */
  setupSeen: boolean;
  /**
   * The app version (`package.json`'s, which an over-the-air update changes)
   * up to which What's New has been shown. It only moves forward.
   */
  whatsNewSeenVersion: string | null;
}

const initialAppState = (): AppState => ({
  changelogSeenVersion: null,
  courseSharingSeen: false,
  welcomeSeen: false,
  setupSeen: false,
  whatsNewSeenVersion: null,
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

export const setWelcomeSeen = () => {
  useAppStateStore.setState({ welcomeSeen: true });
};

export const setSetupSeen = () => {
  useAppStateStore.setState({ setupSeen: true });
};

/** Marks What's New seen up to `version`, never moving it back. */
export const setWhatsNewSeen = (version: string) => {
  const seen = useAppStateStore.getState().whatsNewSeenVersion;
  if (!seen || semverGt(version, seen)) {
    useAppStateStore.setState({ whatsNewSeenVersion: version });
  }
};

export const resetAppState = () => {
  useAppStateStore.setState(initialAppState(), true);
};
