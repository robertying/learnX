import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';
import storeVersions from 'data/storeVersions.json';
import semverGt from 'semver/functions/gt';

export const APP_STATE_KEY = 'appState';

/**
 * What the user has already seen in the app: for the Settings badges, and
 * the welcome, set-up and What's New pages (`helpers/whatsNew`). Also how the
 * window was left, to open it the same way next time.
 */
export interface AppState {
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
  /**
   * The sidebar was hidden. Apps keep this across launches (as NSSplitView's
   * autosave does on the Mac); UIKit only keeps it with the window's saved
   * state, which quitting discards by default.
   */
  sidebarHidden: boolean;
}

const initialAppState = (): AppState => ({
  courseSharingSeen: false,
  welcomeSeen: false,
  setupSeen: false,
  whatsNewSeenVersion: null,
  sidebarHidden: false,
});

export const useAppStateStore = create<AppState>()(
  persist(initialAppState, {
    name: APP_STATE_KEY,
    // Version 1 only ran in development builds.
    version: storeVersions[APP_STATE_KEY],
    storage: persistStorage,
  }),
);

export const useAppState = <T>(selector: (state: AppState) => T) =>
  useAppStateStore(selector);

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
export const setSidebarHidden = (sidebarHidden: boolean) => {
  if (useAppStateStore.getState().sidebarHidden !== sidebarHidden) {
    useAppStateStore.setState({ sidebarHidden });
  }
};

export const setWhatsNewSeen = (version: string) => {
  const seen = useAppStateStore.getState().whatsNewSeenVersion;
  if (!seen || semverGt(version, seen)) {
    useAppStateStore.setState({ whatsNewSeenVersion: version });
  }
};

/**
 * Forgets what the account has seen (on logout or another login). The
 * welcome page, What's New and the window belong to the install, so they
 * stay as they were; the set-up page shows again, since the account's
 * settings start over.
 */
export const resetAppState = () => {
  const { welcomeSeen, whatsNewSeenVersion, sidebarHidden } =
    useAppStateStore.getState();
  useAppStateStore.setState(
    { ...initialAppState(), welcomeSeen, whatsNewSeenVersion, sidebarHidden },
    true,
  );
};
