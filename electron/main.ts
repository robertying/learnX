// learnX's Electron main process: one window showing the app's web build,
// served from app://learnx/, and the services the renderer asks for over IPC
// (preload.cts): requests to Tsinghua's servers, their cookies, key-value
// storage, the saved login, the app's own files and downloads, native menus
// and the web views the page shows (webviews.ts), and what's around the
// window (system.ts): the tray, notifications, the background sync's timer,
// opening, saving and picking files.
//
// Electron's Node runs it, and the modules it imports, as TypeScript, with
// the types stripped as they load: no build step. Only the preloads, which
// run without Node's module loader, are stripped ahead (preloads.ts).
//
// It registers nothing with the system: no protocol handler, and a login item
// only when the user turns Start at login on.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import electron, {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeTheme,
  net,
  protocol,
  safeStorage,
  session,
  shell,
  webContents,
} from 'electron';
import { ORIGIN, createServeApp, fromApp } from './appOrigin.ts';
import { aboutPanelOptions, readBuildInfo } from './buildInfo.ts';
import { createFileStore, loggedWrites } from './fileStore.ts';
import { createFiles, runFileOperation } from './files.ts';
import {
  applyLanguage,
  languageSupported,
  readLanguage,
  saveLanguage,
} from './language.ts';
import { popupMenu } from './menus.ts';
import { mainFetch } from './net.ts';
import { themePdfViewers } from './pdfViewer.ts';
import { PRELOADS_DIR, stripPreloads } from './preloads.ts';
import { createSecrets } from './secrets.ts';
import { claimSingleInstance, setUpSystem } from './system.ts';
import type { System } from './system.ts';
import {
  createUpdater,
  TEST_FIRST_CHECK_DELAY,
  updateMode,
} from './updater.ts';
import type { UpdateMode } from './updater.ts';
import { signedProvider } from './updateSignature.ts';
import {
  PARTITION,
  createWebviews,
  externalUrl,
  hardenWebview,
  webviewPermission,
} from './webviews.ts';
import {
  MIN_SIZE,
  loadWindowState,
  saveWindowState,
  zoomForKey,
} from './windowState.ts';
import packaged from './package.json' with { type: 'json' };

const electronDir = import.meta.dirname;

/**
 * A top-level app's id, named as the repo's other top-level targets are
 * (`io.robertying.learnXTests`): `io.robertying.learnX.<name>` is for the iOS
 * app's extensions, and the iOS bundle id is the Mac Catalyst app's on a Mac.
 */
const APP_ID = 'io.robertying.learnXElectron';
/**
 * The window's session, its own: saved, so Chromium keeps the compiled web
 * build between launches (code cache), and apart from the web views'.
 */
const APP_PARTITION = 'persist:learnx-app';

app.setName('learnX');
if (process.platform === 'win32') {
  // Groups the taskbar button and notifications under learnX.
  app.setAppUserModelId(APP_ID);
}

/**
 * A dev run: Electron opening this folder (`electron electron/`, which sets
 * `process.defaultApp`). `app.isPackaged` only looks at the executable's
 * name, so it's true for the Mac dev runner's learnX.app (macDevApp.ts).
 */
const dev = !app.isPackaged || Boolean(process.defaultApp);

/**
 * An E2E run (electron/e2e sets LEARNX_E2E): it must never take the
 * foreground. On macOS the app starts as an accessory, with no Dock icon, and
 * no run focuses its window or brings it to the front: Windows and Linux show
 * it behind the others, a Mac not at all (system.ts, `present`).
 */
const background = dev && process.env.LEARNX_E2E === '1';
if (process.platform === 'darwin') {
  if (background) {
    app.setActivationPolicy('accessory');
    app.dock?.hide();
  } else if (dev) {
    // The Mac dev app starts as an accessory (LSUIElement, macDevApp.ts),
    // so an E2E run never flashes a Dock icon; any other dev run is a
    // regular app, in the Dock.
    app.setActivationPolicy('regular');
  }
} else if (background && process.platform === 'win32') {
  // Windows tells Chromium which windows others cover completely, and it
  // treats those as hidden: they hardly draw, like a window never shown. The
  // tests' windows open in the same place, each behind the others, so one can
  // sit under another test's for its whole run (a new app's welcome page
  // once took over 30 s to come up).
  app.commandLine.appendSwitch(
    'disable-features',
    'CalculateNativeWinOcclusion',
  );
}

// On Windows, everything learnX keeps (the saved login, settings, cached
// data, downloads, the browser profile) is in the local profile,
// %LOCALAPPDATA%\learnX, not Electron's default %APPDATA%\learnX: that one
// roams, copied to other PCs at every sign-in on a domain with roaming
// profiles (labs, some laptops), downloads and all. The uninstaller removes
// it (installer.nsh).
if (!dev && process.platform === 'win32' && process.env.LOCALAPPDATA) {
  const localData = path.join(process.env.LOCALAPPDATA, 'learnX');
  app.setPath('userData', localData);
  app.setPath('sessionData', localData);
}

// The dev runner (dev.ts) keeps everything Electron writes in one folder
// and out of the system's keychain: a mock one on macOS, Chromium's own key
// on Linux (`basic`), which secrets.ts accepts only here, so a dev run and
// the E2E tests keep their login whatever the keyring (locked, or none on
// CI's runners).
const devDataDir = dev ? process.env.LEARNX_DATA_DIR : undefined;
if (devDataDir) {
  for (const name of [
    'userData',
    'sessionData',
    'logs',
    'crashDumps',
    'temp',
  ] as const) {
    const dir = path.join(devDataDir, name);
    fs.mkdirSync(dir, { recursive: true });
    app.setPath(name, dir);
  }
  app.commandLine.appendSwitch('use-mock-keychain');
  if (process.platform === 'linux') {
    app.commandLine.appendSwitch('password-store', 'basic');
  }
}
// The language chosen in Settings (language.ts), where the app offers one,
// for this launch: Chromium reads `--lang` once the app is ready.
const languageFile = path.join(app.getPath('userData'), 'language.json');
const offersLanguage = languageSupported(
  process.platform,
  dev && process.env.LEARNX_LANGUAGE_SETTING === '1',
);
if (offersLanguage) {
  applyLanguage(app.commandLine, readLanguage(languageFile));
}
/**
 * False in a second launch, which hands its arguments over and quits. Its
 * lock is in the data folder, so after a dev run has moved that.
 */
const primaryInstance = claimSingleInstance(app);
let system: System | undefined;
/**
 * Launch options for a test run (src/services/launchOptions), as JSON: the
 * app's root props, as Android's launch extras are. Development only.
 */
const launchOptions: unknown = dev
  ? JSON.parse(process.env.LEARNX_LAUNCH_OPTIONS || '{}')
  : {};
/** Where dev captures go (`learnx.capture` in the renderer), if anywhere. */
const captureDir = dev ? process.env.LEARNX_CAPTURE_DIR : undefined;
// Development: the window in light or dark whatever the system's setting
// (`LEARNX_COLOR_SCHEME=dark`), for captures of both.
const colorScheme = dev ? process.env.LEARNX_COLOR_SCHEME : undefined;
if (colorScheme === 'light' || colorScheme === 'dark') {
  nativeTheme.themeSource = colorScheme;
}

/** The web build: next to this file when packaged, or the dev runner's. */
const webDir = path.resolve(
  (dev && process.env.LEARNX_WEB_DIR) || path.join(electronDir, 'web'),
);

/**
 * The preloads, as JavaScript: next to this file when packaged; a dev run
 * strips the checkout's now, so it never runs a stale copy (preloads.ts).
 */
const preloadsDir = dev ? PRELOADS_DIR : electronDir;
if (dev) {
  stripPreloads(preloadsDir);
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    // `codeCache`: the web build (one large script) is compiled once and
    // kept, so later launches don't parse all of it again.
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      codeCache: true,
    },
  },
]);

/**
 * Opens a web page in the system's browser, or a mailto: link in its mail
 * app; anything else stays shut. One the system can't open (no mail app set
 * up) does nothing, as a link in the system's own apps does.
 */
const openExternal = (url: string) => {
  if (externalUrl(url)) {
    shell.openExternal(url).catch(() => {});
  }
};

const webviews = createWebviews({ openExternal });

const handleIpc = (ses: Electron.Session) => {
  const logStorage = (message: string) => console.error(`[storage] ${message}`);
  const store = createFileStore(path.join(app.getPath('userData'), 'storage'), {
    log: logStorage,
  });
  const secrets = createSecrets(
    createFileStore(app.getPath('userData'), { log: logStorage }),
    safeStorage,
    { allowFallbackKey: Boolean(devDataDir) },
  );

  // Key-value storage. A database is read once, synchronously, when the
  // renderer first opens it; writes are sent in order without waiting.
  ipcMain.on('storage:load', (event, db) => {
    fromApp(event);
    event.returnValue = store.readAll(db);
  });
  const writes = loggedWrites(store, logStorage);
  ipcMain.on('storage:set', (event, db, key, value) => {
    fromApp(event);
    writes.setItem(db, key, value);
  });
  ipcMain.on('storage:remove', (event, db, key) => {
    fromApp(event);
    writes.removeItem(db, key);
  });
  ipcMain.on('storage:clear', (event, db) => {
    fromApp(event);
    writes.clear(db);
  });

  ipcMain.handle('secrets:get', (event, key) => {
    fromApp(event);
    return secrets.get(key);
  });
  ipcMain.handle('secrets:set', (event, key, value) => {
    fromApp(event);
    return secrets.set(key, value);
  });
  ipcMain.handle('secrets:remove', (event, key) => {
    fromApp(event);
    return secrets.remove(key);
  });

  /** Requests in flight, by the renderer's id, so it can abort them. */
  const inFlight = new Map<unknown, AbortController>();
  ipcMain.handle('fetch', async (event, id, req) => {
    fromApp(event);
    const controller = new AbortController();
    inFlight.set(id, controller);
    try {
      return await mainFetch(net, ses, req, controller.signal);
    } finally {
      inFlight.delete(id);
    }
  });
  ipcMain.on('fetch:abort', (event, id) => {
    fromApp(event);
    inFlight.get(id)?.abort();
  });

  ipcMain.handle('cookies:get', (event, url) => {
    fromApp(event);
    return ses.cookies.get({ url });
  });
  ipcMain.handle('cookies:set', (event, details) => {
    fromApp(event);
    return ses.cookies.set(details);
  });
  ipcMain.handle('cookies:remove', (event, url, name) => {
    fromApp(event);
    return ses.cookies.remove(url, name);
  });
  ipcMain.handle('cookies:clearAll', event => {
    fromApp(event);
    return ses.clearStorageData({ storages: ['cookies'] });
  });

  // A native menu (a card's context menu, a header's menu), resolving with
  // the id of the item chosen, or null.
  ipcMain.handle('menu:popup', (event, items, position) => {
    fromApp(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? popupMenu(Menu, win, items, position) : null;
  });

  // The app's own files, synchronous as expo-file-system's are.
  const files = createFiles({
    cache: path.join(app.getPath('userData'), 'Files', 'Caches'),
    document: path.join(app.getPath('userData'), 'Files', 'Documents'),
  });
  system = setUpSystem({
    electron,
    fromApp,
    files,
    cacheDir: path.join(app.getPath('userData'), 'Files', 'Caches'),
    iconFile,
    dev,
    background,
  });
  ipcMain.on('files', (event, op, ...args) => {
    fromApp(event);
    event.returnValue = runFileOperation(files, op, args);
  });
  /** Downloads in flight, by the renderer's id, so it can abort them. */
  const downloads = new Map<unknown, AbortController>();
  ipcMain.handle('files:append', (event, uri, content) => {
    fromApp(event);
    files.append(uri, content);
  });
  ipcMain.handle('files:download', async (event, id, req) => {
    fromApp(event);
    const controller = new AbortController();
    downloads.set(id, controller);
    try {
      return await files.download(net, ses, req, {
        signal: controller.signal,
        onProgress: (written, total) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('files:progress', id, written, total);
          }
        },
      });
    } finally {
      downloads.delete(id);
    }
  });
  ipcMain.on('files:abortDownload', (event, id) => {
    fromApp(event);
    downloads.get(id)?.abort();
  });

  ipcMain.handle('webview:configure', (event, guestId, scripts) => {
    fromApp(event);
    return webviews.configure(
      event.sender,
      webContents.fromId(guestId),
      scripts,
    );
  });
  ipcMain.handle('webview:loadHtml', (event, guestId, html, baseUrl) => {
    fromApp(event);
    return webviews.loadHtml(
      event.sender,
      webContents.fromId(guestId),
      html,
      baseUrl,
    );
  });
  ipcMain.on('webview:answer', (event, requestId, allow) => {
    fromApp(event);
    webviews.answer(event.sender, requestId, allow);
  });
  // From a web view's own preload (webviewPreload.cts).
  ipcMain.on('webview:scripts', event => {
    event.returnValue = webviews.scriptsFor(event.sender);
  });

  ipcMain.on('launchOptions', event => {
    fromApp(event);
    event.returnValue = launchOptions;
  });

  ipcMain.handle('capture', async (event, name) => {
    fromApp(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!captureDir || !win || !/^[\w-]+$/.test(name)) {
      return null;
    }
    // A frame drawn now, not the last one Chromium kept.
    win.webContents.invalidate();
    await new Promise(resolve => setTimeout(resolve, 300));
    const image = await win.webContents.capturePage();
    const file = path.join(captureDir, `${name}.png`);
    fs.mkdirSync(captureDir, { recursive: true });
    fs.writeFileSync(file, image.toPNG());
    // A window's capture leaves its web views out: each gets its own, except
    // those in a hidden screen or tab, which have no frame to capture.
    const guests = webContents
      .getAllWebContents()
      .filter(
        guest =>
          guest.getType() === 'webview' &&
          guest.hostWebContents === event.sender,
      );
    for (const [index, guest] of guests.entries()) {
      const guestImage = await guest.capturePage().catch(() => null);
      if (!guestImage) {
        continue;
      }
      fs.writeFileSync(
        path.join(captureDir, `${name}-webview-${index + 1}.png`),
        guestImage.toPNG(),
      );
    }
    return file;
  });
};

const iconFile = path.join(
  electronDir,
  'icons',
  process.platform === 'win32' ? 'icon.ico' : 'icon.png',
);

/**
 * How many times in a row a crashed page is loaded again before it's left,
 * so one that crashes as it loads isn't reloaded for ever.
 */
const MAX_PAGE_RELOADS = 3;
/**
 * How long a page reloaded after a crash has to run for its next crash to
 * start a new count: learnX stays in the tray for weeks, and a crash now and
 * then shouldn't use up its reloads for good.
 */
const PAGE_RELOAD_RESET_MS = 10 * 60 * 1000;

/**
 * The window, on the app's own session (`ses`, which serves app://), where it
 * was last time (windowState.ts).
 */
const createWindow = (ses: Electron.Session) => {
  const stateFile = path.join(app.getPath('userData'), 'window-state.json');
  const state = loadWindowState(
    stateFile,
    // Read once the app is ready: Electron's screen module needs it.
    electron.screen.getAllDisplays().map(display => display.workArea),
  );
  const win = new BrowserWindow({
    ...state.bounds,
    ...MIN_SIZE,
    title: 'learnX',
    icon: iconFile,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f1f1f' : '#fafafa',
    webPreferences: {
      session: ses,
      preload: path.join(preloadsDir, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // The page's web views (webviews.ts), hardened as they attach.
      webviewTag: true,
      spellcheck: false,
      // Captures, and E2E runs, whose window stays behind the others (or
      // hidden, on a Mac), need frames drawn while it's in the background.
      backgroundThrottling: !captureDir && !background,
    },
  });
  // An E2E run's window takes no input from the system's pointer, only the
  // tests' (sent to the page, not the system): windows of parallel runs
  // that open and close under the pointer, or a person's mouse passing over,
  // would otherwise end a hover a test made (a card's hover buttons).
  if (background) {
    win.setIgnoreMouseEvents(true);
  }
  win.on('close', () => saveWindowState(stateFile, win));
  // Zoom from the keyboard, kept with the window's state, and again after
  // the page loads anew (a crash's reload). Keys typed in a web view (a
  // notice body, courseX) zoom the window too: web views follow its zoom.
  let zoom = state.zoom;
  const zoomOnKeys = (contents: Electron.WebContents) =>
    contents.on('before-input-event', (event, input) => {
      const level = zoomForKey(
        input,
        win.webContents.getZoomLevel(),
        process.platform,
      );
      if (level !== null) {
        event.preventDefault();
        zoom = level;
        win.webContents.setZoomLevel(level);
      }
    });
  zoomOnKeys(win.webContents);
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomLevel(zoom);
  });
  // The window is named after what the page shows, as Windows names a
  // document's window ("<title> - learnX"), or learnX
  // (services/windows.ts): Alt+Tab, the taskbar and screen readers say it.
  win.on('page-title-updated', (event, title) => {
    event.preventDefault();
    const name = title.trim();
    win.setTitle(name && name !== 'learnX' ? `${name} - learnX` : 'learnX');
  });
  // A crashed page (out of memory, a GPU fault) is loaded again rather than
  // left blank in the tray, a few times in a row at most.
  let reloads = 0;
  let reloadedAt = 0;
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[window] page gone: ${details.reason}`);
    if (Date.now() - reloadedAt > PAGE_RELOAD_RESET_MS) {
      reloads = 0;
    }
    if (details.reason !== 'clean-exit' && reloads < MAX_PAGE_RELOADS) {
      reloads += 1;
      reloadedAt = Date.now();
      void win.loadURL(`${ORIGIN}/`);
    }
  });
  // The window shows once its page has drawn, so it never shows blank, except
  // when Start at login starts learnX in the tray (Windows). On Linux it
  // shows at once, in its background color: under Wayland a window that was
  // never shown gets no frames, so a page that first draws after a large
  // script (the app's) never draws, and `ready-to-show` never comes.
  // A window saved maximized is maximized as it's shown (`maximize()` shows
  // it): at once, or when it first leaves the tray after Start at login.
  const reveal = () => {
    if (system?.startsHidden()) {
      if (state.maximized) {
        win.once('show', () => win.maximize());
      }
      return;
    }
    system?.present(win, { maximize: state.maximized, focus: false });
  };
  if (process.platform === 'linux') {
    reveal();
  } else {
    win.once('ready-to-show', reveal);
  }

  // Links open in the browser or the mail app (React Native Web's Linking
  // opens both as a new window); the window itself never leaves the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${ORIGIN}/`)) {
      event.preventDefault();
    }
  });
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    if (
      !hardenWebview(
        webPreferences,
        params,
        path.join(preloadsDir, 'webviewPreload.cjs'),
        { backgroundThrottling: !captureDir && !background },
      )
    ) {
      event.preventDefault();
    }
  });
  themePdfViewers(win.webContents, nativeTheme);
  win.webContents.on('did-attach-webview', (_event, guest) => {
    webviews.guard(guest);
    zoomOnKeys(guest);
    themePdfViewers(guest, nativeTheme);
  });
  if (dev) {
    win.webContents.on('console-message', ({ level, message }) => {
      if (level === 'warning' || level === 'error') {
        console.log(`[renderer ${level}] ${message}`);
      }
    });
  }
  void win.loadURL(`${ORIGIN}/`);
  return win;
};

// The version, the About panel and updates (buildInfo.ts, updater.ts). A
// packaged build carries its build number and where it looks for updates in
// its package.json (written by packageConfig.ts), and the public key its
// update files are signed with (electron-public-key.pem); a dev run reads the
// checkout's, and checks for updates only on a local test server at
// `LEARNX_UPDATE_URL` (updateServer.ts), signed by the key whose public half
// is at `LEARNX_UPDATE_PUBLIC_KEY` if set.
const { buildNumber, updateUrl } = packaged as {
  buildNumber?: string;
  updateUrl?: string;
};
const buildInfo = dev
  ? readBuildInfo(path.join(electronDir, '..'))
  : { version: app.getVersion(), build: buildNumber ?? '' };
const devUpdateUrl = dev ? process.env.LEARNX_UPDATE_URL : undefined;
/** A dev run's updater log lines, for the E2E tests (`learnxUpdaterLog`). */
const devUpdaterLog: string[] | undefined = dev ? [] : undefined;
if (devUpdaterLog) {
  Object.assign(globalThis, { learnxUpdaterLog: devUpdaterLog });
}
/**
 * How this run takes updates (updater.ts): a packaged build's by how it was
 * installed, a dev run's on the test server by `LEARNX_UPDATE_MODE` (`notify`
 * for a .deb's). What kind of package it is, electron-builder writes into
 * `package-type` (`deb`).
 */
const readPackageType = () => {
  try {
    return fs
      .readFileSync(path.join(process.resourcesPath, 'package-type'), 'utf8')
      .trim();
  } catch {
    return undefined;
  }
};
const mode: UpdateMode | null = devUpdateUrl
  ? process.env.LEARNX_UPDATE_MODE === 'notify'
    ? 'notify'
    : 'install'
  : updateMode({
      dev,
      platform: process.platform,
      env: process.env,
      hasUpdateConfig:
        !!updateUrl &&
        fs.existsSync(path.join(process.resourcesPath, 'app-update.yml')),
      packageType: readPackageType(),
    });
/**
 * The updater, once electron-updater has loaded: only for a run that takes
 * updates, after its first module has run (it takes a while to load, and
 * most of it is never used otherwise).
 */
const loadUpdater = async (updaterMode: UpdateMode) => {
  const [
    { autoUpdater: platformUpdater, DebUpdater },
    { GenericProvider },
    { parseUpdateInfo },
    { getChannelFilename, newUrlFromBase },
  ] = await Promise.all([
    // CommonJS, its `autoUpdater` a getter Node only shows on the default
    // export.
    import('electron-updater').then(updaterModule => updaterModule.default),
    import('electron-updater/out/providers/GenericProvider.js'),
    import('electron-updater/out/providers/Provider.js'),
    import('electron-updater/out/util.js'),
  ]);
  // A .deb's (`notify`), as electron-updater picks by `package-type`; also a
  // dev run's in that mode, which has no `package-type`.
  const autoUpdater =
    updaterMode === 'notify' ? new DebUpdater() : platformUpdater;
  if (devUpdateUrl && devDataDir) {
    // What electron-builder writes into a packaged build's app-update.yml:
    // where updates come from, here the test server, and the cache folder's
    // name.
    const config = path.join(devDataDir, 'app-update.yml');
    fs.writeFileSync(
      config,
      [
        'provider: generic',
        `url: ${devUpdateUrl}`,
        'updaterCacheDirName: learnX',
        '',
      ].join('\n'),
    );
    autoUpdater.updateConfigPath = config;
    autoUpdater.forceDevUpdateConfig = true;
    // Its downloads stay in the data folder too, not in the system's caches
    // (~/Library/Caches/learnX, %LOCALAPPDATA%, ~/.cache): the app adapter's
    // (protected) cache folder, which it reads them under.
    Object.defineProperty(
      (autoUpdater as unknown as { app: object }).app,
      'baseCachePath',
      { value: path.join(devDataDir, 'updates') },
    );
    // The checkout's version, not this folder's package.json's (0.0.0), as
    // electron-updater's own copy of semver parses it.
    const updaterRequire = createRequire(
      createRequire(import.meta.url).resolve('electron-updater'),
    );
    const semver = updaterRequire('semver') as typeof import('semver');
    Object.assign(autoUpdater, {
      currentVersion: semver.parse(buildInfo.version),
    });
  }
  const publicKey = fs.readFileSync(
    dev
      ? process.env.LEARNX_UPDATE_PUBLIC_KEY ||
          path.join(electronDir, '..', 'certs', 'electron-public-key.pem')
      : path.join(electronDir, 'electron-public-key.pem'),
  );
  const feedUrl = devUpdateUrl || updateUrl || '';
  return createUpdater({
    autoUpdater,
    mode: updaterMode,
    // The verified .deb, in the system's installer (GNOME Software, App
    // Center), which asks for the password; shown in its folder where none
    // opens .debs, to install with apt.
    openInstaller: file => {
      void shell.openPath(file).then(error => {
        if (error) {
          console.error(`[updater] couldn't open the installer: ${error}`);
          shell.showItemInFolder(file);
        }
      });
    },
    feed: {
      url: feedUrl,
      provider: signedProvider({
        GenericProvider,
        parseUpdateInfo,
        getChannelFilename,
        newUrlFromBase,
        publicKey,
      }),
    },
    onReady: update => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('updates:ready', update);
      }
    },
    log: message => {
      console.log(`[updater] ${message}`);
      devUpdaterLog?.push(message);
    },
    ...(devUpdateUrl ? { firstCheckDelay: TEST_FIRST_CHECK_DELAY } : {}),
  });
};
/** The updater, once it's loaded; null in a run without updates. */
let updater: ReturnType<typeof createUpdater> | null = null;
/**
 * Whether this run checks for updates (Settings › Notifications offers New
 * Versions then). E2E runs (electron/e2e) turn checks off with
 * LEARNX_NO_UPDATES, and a second launch only hands its arguments over.
 */
const updaterRunning =
  !process.env.LEARNX_NO_UPDATES && primaryInstance && !!mode;
const updaterLoaded =
  updaterRunning && mode
    ? loadUpdater(mode).then(
        loaded => {
          updater = loaded;
          return loaded;
        },
        (error: unknown) => {
          console.error(`[updater] not loaded: ${String(error)}`);
          return null;
        },
      )
    : Promise.resolve(null);
/**
 * A packaged Linux run without Chromium's sandbox: the AppImage's AppRun
 * passes --no-sandbox where unprivileged user namespaces are blocked (Ubuntu
 * 24.04 and later). Settings then suggests the .deb, which is sandboxed.
 */
const unsandboxed =
  !dev &&
  process.platform === 'linux' &&
  app.commandLine.hasSwitch('no-sandbox');
ipcMain.on('app:info', event => {
  fromApp(event);
  event.returnValue = { ...buildInfo, unsandboxed };
});
ipcMain.handle('language:get', event => {
  fromApp(event);
  return {
    supported: offersLanguage,
    language: offersLanguage ? readLanguage(languageFile) : 'system',
  };
});
ipcMain.handle('language:set', (event, language) => {
  fromApp(event);
  return offersLanguage && saveLanguage(languageFile, language);
});
// Quits and starts learnX again, with its arguments, for a new language.
ipcMain.on('app:relaunch', event => {
  fromApp(event);
  app.relaunch();
  app.quit();
});
ipcMain.on('updates:checks', event => {
  fromApp(event);
  event.returnValue = updaterRunning;
});
ipcMain.on('updates:pending', event => {
  fromApp(event);
  event.returnValue = updater?.ready() ?? null;
});
ipcMain.on('updates:install', event => {
  fromApp(event);
  updater?.install();
});
// No application menu in a packaged build: Electron's default one (shown with
// Alt) is English-only and has Developer Tools, Force Reload and Electron's
// help links, and its shortcuts work even hidden. Windows and Linux keep the
// text fields' editing shortcuts without one, and the page has its own
// (modules/menus). Dev runs keep it, for Developer Tools.
if (!dev) {
  Menu.setApplicationMenu(null);
}

void app.whenReady().then(async () => {
  app.setAboutPanelOptions(aboutPanelOptions(buildInfo, iconFile));
  (await updaterLoaded)?.start();
});

void app.whenReady().then(() => {
  if (!primaryInstance) {
    return;
  }
  // The web views' session (PARTITION), whose cookies the app's requests use
  // too, and the window's own, the only one that serves app://:
  // a page in a web view (a notice's HTML) can't load the app's scripts or
  // another download's preview.
  const ses = session.fromPartition(PARTITION);
  const appSession = session.fromPartition(APP_PARTITION);
  appSession.protocol.handle(
    'app',
    createServeApp({
      webDir,
      fetchFile: url => net.fetch(url),
      servePreview: () => system?.servePreview,
    }),
  );
  // No camera, microphone, location or notifications asked of the system;
  // a web view's page may only go full screen and copy (webviews.ts).
  ses.setPermissionRequestHandler((contents, permission, callback, details) =>
    callback(
      webviewPermission(contents, permission, details.requestingUrl ?? ''),
    ),
  );
  ses.setPermissionCheckHandler((contents, permission, requestingOrigin) =>
    webviewPermission(contents, permission, requestingOrigin),
  );
  appSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  appSession.setPermissionCheckHandler(() => false);
  // The web views' top-level loads wait for the page to decide on them.
  ses.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'], types: ['mainFrame'] },
    webviews.onBeforeRequest,
  );
  handleIpc(ses);
  createWindow(appSession);
});

// Closing the window hides it (system.ts); with the window gone, so is
// learnX.
app.on('window-all-closed', () => app.quit());
