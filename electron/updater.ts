// Keeps the packaged app up to date with electron-updater: checks shortly
// after launch and every few hours, downloads in the background, and installs
// when the app quits, or at once when the user restarts from Settings
// (`learnx.updates.install`). Updates come from the TUNA mirror's copy of the
// latest GitHub release (`v<version>`, the mobile apps' too), through
// electron-updater's generic provider as app-update.yml names it
// (packageConfig.ts). Builds are unsigned, so Windows checks no publisher
// signature on the installer; electron-updater checks its SHA-512 against
// the release's update file (latest.yml, latest-linux.yml), which it reads
// only with a valid signature by learnX's update key (updateSignature.ts).
// So nothing the mirror alone changes is downloaded, let alone installed on
// quit.
//
// The mirror copies a release's files on a schedule, so a check can find the
// new latest.yml before its installer: the download then fails, which is
// only logged (no error reaches the page), and a check half an hour later
// tries again.
import type { AppUpdater, UpdateInfo } from 'electron-updater';

/** The first check, after the window has had time to load. */
export const FIRST_CHECK_DELAY = 10 * 1000;
/**
 * A dev run's first check on a local test server (`LEARNX_UPDATE_URL`): the
 * E2E tests wait for it, and the page asks for an update that came before it
 * listened (`updates:pending`).
 */
export const TEST_FIRST_CHECK_DELAY = 1000;
/** Later checks, while the app keeps running (in the tray). */
export const CHECK_INTERVAL = 4 * 60 * 60 * 1000;
/** Another check after one failed: offline, or the mirror mid-copy. */
export const RETRY_DELAY = 30 * 60 * 1000;

export type UpdateMode = 'install' | 'notify';

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
 * A .deb is told apart first: an AppImage's runtime sets `APPIMAGE` for
 * everything it starts, so a .deb opened from a terminal or launcher that
 * runs as an AppImage has one too, and would otherwise install updates on
 * quit, asking for an administrator's password as it closes.
 */
export const updateMode = ({
  dev,
  platform,
  env,
  hasUpdateConfig,
  packageType,
}: {
  dev: boolean;
  platform: string;
  env: Record<string, string | undefined>;
  hasUpdateConfig: boolean;
  packageType?: string;
}): UpdateMode | null => {
  if (dev || !hasUpdateConfig) {
    return null;
  }
  if (platform === 'linux' && packageType === 'deb') {
    return 'notify';
  }
  return platform === 'win32' || (platform === 'linux' && env.APPIMAGE)
    ? 'install'
    : null;
};

/**
 * The .deb of `version` for this CPU, as packageConfig.ts names it
 * (electron-builder calls x64 amd64 for Debian).
 * @param arch Node's (`process.arch`)
 */
export const debFileName = (version: string, arch: string): string =>
  `learnX-linux-${arch === 'x64' ? 'amd64' : arch}-v${version}.deb`;

export type ReadyUpdate = {
  version: string;
  /** In `notify` mode, the installer to download. */
  download?: string;
};

/** What the updater uses of electron-updater's `autoUpdater`. */
export type AutoUpdater = Pick<
  AppUpdater,
  | 'setFeedURL'
  | 'autoDownload'
  | 'autoInstallOnAppQuit'
  | 'allowPrerelease'
  | 'allowDowngrade'
  | 'logger'
  | 'checkForUpdates'
  | 'quitAndInstall'
> & {
  on(
    event: 'update-downloaded' | 'update-available',
    listener: (info: Pick<UpdateInfo, 'version'>) => void,
  ): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
};

export const createUpdater = ({
  autoUpdater,
  mode = 'install',
  downloadUrl = () => '',
  feed,
  onReady,
  log = () => {},
  firstCheckDelay = FIRST_CHECK_DELAY,
  timers = { setTimeout, setInterval },
}: {
  autoUpdater: AutoUpdater;
  mode?: UpdateMode;
  downloadUrl?: (version: string) => string;
  // electron-updater's Provider, which a custom feed takes as a class.
  feed: { url: string; provider: new (...args: any[]) => any };
  onReady: (update: ReadyUpdate) => void;
  log?: (message: string) => void;
  firstCheckDelay?: number;
  timers?: {
    setTimeout: (callback: () => void, ms: number) => unknown;
    setInterval: (callback: () => void, ms: number) => unknown;
  };
}) => {
  let ready: ReadyUpdate | null = null;
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
    warn: (message: unknown) => log(`warn: ${String(message)}`),
    error: (message: unknown) => log(`error: ${String(message)}`),
  };
  if (mode === 'install') {
    autoUpdater.on('update-downloaded', info => {
      ready = { version: info.version };
      log(`downloaded ${info.version}`);
      onReady(ready);
    });
  } else {
    autoUpdater.on('update-available', info => {
      ready = { version: info.version, download: downloadUrl(info.version) };
      log(`available ${info.version}`);
      onReady(ready);
    });
  }
  // Offline, the mirror out of reach, or a release's files only partly
  // copied there (a 404, a signature not there yet, or a checksum that
  // doesn't match yet): tried again half an hour later, once.
  autoUpdater.on('error', error => {
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
  const check = async (): Promise<void> => {
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
      }, firstCheckDelay);
      timers.setInterval(() => {
        void check();
      }, CHECK_INTERVAL);
    },
    check,
    /**
     * The update downloaded and waiting to be installed, or in `notify`
     * mode the one out, if any.
     */
    ready: (): ReadyUpdate | null => ready,
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
