// Keeps the packaged app up to date with electron-updater: checks shortly
// after launch and every few hours, downloads in the background, and installs
// when the app quits, or at once when the user restarts from Settings
// (`learnx.updates.install`). Builds are unsigned while the app is
// experimental, so Windows checks no publisher signature on the installer;
// electron-updater still checks its SHA-512 against the release's update file.

/** The first check, after the window has had time to load. */
const FIRST_CHECK_DELAY = 10 * 1000;
/** Later checks, while the app keeps running (in the tray). */
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;

/**
 * Whether this run can update itself: a packaged build installed by NSIS on
 * Windows, or run as an AppImage on Linux (electron-updater sets `APPIMAGE`'s
 * meaning; a .deb is updated by its package manager). Never a dev run, and
 * never on macOS, which has the Mac Catalyst app.
 *
 * @param {{ dev: boolean; platform: string; env: Record<string, string | undefined> }} run
 */
const updatesSupported = ({ dev, platform, env }) =>
  !dev && (platform === 'win32' || (platform === 'linux' && !!env.APPIMAGE));

/**
 * @typedef {{ version: string }} ReadyUpdate
 *
 * @param {{
 *   autoUpdater: any;
 *   feed: Record<string, unknown>;
 *   onReady: (update: ReadyUpdate) => void;
 *   log?: (message: string) => void;
 *   timers?: { setTimeout: typeof setTimeout; setInterval: typeof setInterval };
 * }} options
 */
const createUpdater = ({
  autoUpdater,
  feed,
  onReady,
  log = () => {},
  timers = { setTimeout, setInterval },
}) => {
  /** @type {ReadyUpdate | null} */
  let ready = null;
  let checking = false;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.setFeedURL(feed);
  autoUpdater.logger = {
    info: () => {},
    debug: () => {},
    warn: (/** @type {unknown} */ message) => log(`warn: ${message}`),
    error: (/** @type {unknown} */ message) => log(`error: ${message}`),
  };
  autoUpdater.on(
    'update-downloaded',
    (/** @type {{ version: string }} */ info) => {
      ready = { version: info.version };
      log(`downloaded ${info.version}`);
      onReady(ready);
    },
  );
  // Offline, or GitHub out of reach: the next check tries again.
  autoUpdater.on('error', (/** @type {Error} */ error) =>
    log(`failed: ${error.message}`),
  );

  /** One check, unless one is running or an update is already waiting. */
  const check = async () => {
    if (checking || ready) {
      return;
    }
    checking = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // Reported through the 'error' event.
    } finally {
      checking = false;
    }
  };

  return {
    /** Checks shortly after launch, then every few hours. */
    start: () => {
      timers.setTimeout(() => {
        void check();
      }, FIRST_CHECK_DELAY);
      timers.setInterval(() => {
        void check();
      }, CHECK_INTERVAL);
    },
    check,
    /** The update downloaded and waiting to be installed, if any. */
    ready: () => ready,
    /**
     * Quits and installs the waiting update, then opens the app again (the
     * installer runs silently, as on quit).
     */
    install: () => {
      if (ready) {
        autoUpdater.quitAndInstall(true, true);
      }
    },
  };
};

module.exports = {
  CHECK_INTERVAL,
  FIRST_CHECK_DELAY,
  createUpdater,
  updatesSupported,
};
