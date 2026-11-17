// Keeps the packaged app up to date with electron-updater: checks shortly
// after launch and every few hours, downloads in the background, and installs
// when the app quits, or at once when the user restarts from Settings
// (`learnx.updates.install`). Updates come from the TUNA mirror's copy of the
// latest GitHub release (`v<version>`, the mobile apps' too), through
// electron-updater's generic provider as app-update.yml names it
// (packageConfig.cjs). Builds are unsigned, so Windows checks no publisher
// signature on the installer; electron-updater checks its SHA-512 against
// the release's update file (latest.yml, latest-linux.yml), which it reads
// only with a valid signature by learnX's update key (updateSignature.cjs).
// So nothing the mirror alone changes is downloaded, let alone installed on
// quit.
//
// The mirror copies a release's files on a schedule, so a check can find the
// new latest.yml before its installer: the download then fails, which is
// only logged (no error reaches the page), and a check half an hour later
// tries again.

/** The first check, after the window has had time to load. */
const FIRST_CHECK_DELAY = 10 * 1000;
/** Later checks, while the app keeps running (in the tray). */
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;
/** Another check after one failed: offline, or the mirror mid-copy. */
const RETRY_DELAY = 30 * 60 * 1000;

/**
 * How this run takes updates, if it does, from the app-update.yml its
 * target wrote (an unpacked `--dir` build has none): `install`, downloading
 * and installing them itself (NSIS on Windows; an AppImage on Linux, where
 * `APPIMAGE` is its path), or `notify`, only saying one is out with a link to
 * it (a .deb, which electron-builder marks in `package-type`: installing one
 * needs an administrator's password, as Android's APKs need the user's
 * consent). Never a dev run, and never on macOS, which has the Mac Catalyst
 * app.
 *
 * @param {{ dev: boolean; platform: string; env: Record<string, string | undefined>; hasUpdateConfig: boolean; packageType?: string }} run
 * @returns {'install' | 'notify' | null}
 */
const updateMode = ({ dev, platform, env, hasUpdateConfig, packageType }) => {
  if (dev || !hasUpdateConfig) {
    return null;
  }
  if (platform === 'win32' || (platform === 'linux' && env.APPIMAGE)) {
    return 'install';
  }
  return platform === 'linux' && packageType === 'deb' ? 'notify' : null;
};

/**
 * The .deb of `version` for this CPU, as packageConfig.cjs names it
 * (electron-builder calls x64 amd64 for Debian).
 * @param {string} version
 * @param {string} arch Node's (`process.arch`)
 */
const debFileName = (version, arch) =>
  `learnX-linux-${arch === 'x64' ? 'amd64' : arch}-v${version}.deb`;

/**
 * @typedef {{ version: string; download?: string }} ReadyUpdate
 *   `download`: in `notify` mode, the installer to download
 *
 * @param {{
 *   autoUpdater: any;
 *   mode?: 'install' | 'notify';
 *   downloadUrl?: (version: string) => string;
 *   feed: { url: string; provider: new (...args: any[]) => any };
 *   onReady: (update: ReadyUpdate) => void;
 *   log?: (message: string) => void;
 *   timers?: { setTimeout: typeof setTimeout; setInterval: typeof setInterval };
 * }} options
 */
const createUpdater = ({
  autoUpdater,
  mode = 'install',
  downloadUrl = () => '',
  feed,
  onReady,
  log = () => {},
  timers = { setTimeout, setInterval },
}) => {
  /** @type {ReadyUpdate | null} */
  let ready = null;
  let checking = false;
  let started = false;
  let retryScheduled = false;

  // Where updates come from (app-update.yml's url), read through the
  // provider that checks the update file's signature.
  autoUpdater.setFeedURL({
    provider: 'custom',
    updateProvider: feed.provider,
    url: feed.url,
  });
  // Only a verified update file is ever read (the provider), so only a
  // verified update downloads and installs on quit.
  autoUpdater.autoDownload = mode === 'install';
  autoUpdater.autoInstallOnAppQuit = mode === 'install';
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = {
    info: () => {},
    debug: () => {},
    warn: (/** @type {unknown} */ message) => log(`warn: ${message}`),
    error: (/** @type {unknown} */ message) => log(`error: ${message}`),
  };
  if (mode === 'install') {
    autoUpdater.on(
      'update-downloaded',
      (/** @type {{ version: string }} */ info) => {
        ready = { version: info.version };
        log(`downloaded ${info.version}`);
        onReady(ready);
      },
    );
  } else {
    autoUpdater.on(
      'update-available',
      (/** @type {{ version: string }} */ info) => {
        ready = { version: info.version, download: downloadUrl(info.version) };
        log(`available ${info.version}`);
        onReady(ready);
      },
    );
  }
  // Offline, the mirror out of reach, or a release's files only partly
  // copied there (a 404, a signature not there yet, or a checksum that
  // doesn't match yet): tried again half an hour later, once.
  autoUpdater.on('error', (/** @type {Error} */ error) => {
    log(`failed: ${error.message}`);
    if (started && !retryScheduled) {
      retryScheduled = true;
      timers.setTimeout(() => {
        retryScheduled = false;
        void check();
      }, RETRY_DELAY);
    }
  });

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
      started = true;
      timers.setTimeout(() => {
        void check();
      }, FIRST_CHECK_DELAY);
      timers.setInterval(() => {
        void check();
      }, CHECK_INTERVAL);
    },
    check,
    /**
     * The update downloaded and waiting to be installed, or in `notify`
     * mode the one out, if any.
     */
    ready: () => ready,
    /**
     * Quits and installs the waiting update, then opens the app again (the
     * installer runs silently, as on quit). Nothing in `notify` mode.
     */
    install: () => {
      if (ready && mode === 'install') {
        autoUpdater.quitAndInstall(true, true);
      }
    },
  };
};

module.exports = {
  CHECK_INTERVAL,
  FIRST_CHECK_DELAY,
  RETRY_DELAY,
  createUpdater,
  debFileName,
  updateMode,
};
