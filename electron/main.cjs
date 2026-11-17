// learnX's Electron main process: one window showing the app's web build,
// served from app://learnx/, and the services the renderer asks for over IPC
// (preload.cjs): requests to Tsinghua's servers, their cookies, key-value
// storage, the saved login, the app's own files and downloads, native menus
// and the web views the page shows (webviews.cjs), and what's around the
// window (desktop.cjs): the tray, notifications, the background sync's timer,
// opening, saving and picking files.
//
// It registers nothing with the system: no protocol handler, and a login item
// only when the user turns Start at login on.
const fs = require('node:fs');
const path = require('node:path');
const {
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
} = require('electron');
const { ORIGIN, createServeApp, fromApp } = require('./appOrigin.cjs');
const { aboutPanelOptions, readBuildInfo } = require('./buildInfo.cjs');
const { claimSingleInstance, setUpDesktop } = require('./desktop.cjs');
const { createFileStore, loggedWrites } = require('./fileStore.cjs');
const { createFiles, runFileOperation } = require('./files.cjs');
const { popupMenu } = require('./menus.cjs');
const { mainFetch } = require('./net.cjs');
const { createSecrets } = require('./secrets.cjs');
const { createUpdater, updatesSupported } = require('./updater.cjs');
const { signedProvider } = require('./updateSignature.cjs');
const {
  PARTITION,
  createWebviews,
  hardenWebview,
  webviewPermission,
} = require('./webviews.cjs');
const {
  MIN_SIZE,
  loadWindowState,
  saveWindowState,
} = require('./windowState.cjs');

/**
 * A top-level app's id, named as the repo's other top-level targets are
 * (`io.robertying.learnXTests`): `io.robertying.learnX.<name>` is for the iOS
 * app's extensions, and the iOS bundle id is the Mac Catalyst app's on a Mac.
 */
const APP_ID = 'io.robertying.learnXElectron';
/** The window's session: in memory, as the page keeps its data over IPC. */
const APP_PARTITION = 'learnx-app';

app.setName('learnX');
if (process.platform === 'win32') {
  // Groups the taskbar button and notifications under learnX.
  app.setAppUserModelId(APP_ID);
}

/**
 * A dev run: Electron opening this folder (`electron electron/`, which sets
 * `process.defaultApp`). `app.isPackaged` only looks at the executable's
 * name, so it's true for the Mac dev runner's learnX.app (macDevApp.mjs).
 */
const dev = !app.isPackaged || Boolean(process.defaultApp);

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

// The dev runner (dev.mjs) keeps everything Electron writes in one folder
// and out of the system's keychain.
const devDataDir = dev ? process.env.LEARNX_DATA_DIR : undefined;
if (devDataDir) {
  for (const name of /** @type {const} */ ([
    'userData',
    'sessionData',
    'logs',
    'crashDumps',
    'temp',
  ])) {
    const dir = path.join(devDataDir, name);
    fs.mkdirSync(dir, { recursive: true });
    app.setPath(name, dir);
  }
  app.commandLine.appendSwitch('use-mock-keychain');
}
/**
 * False in a second launch, which hands its arguments over and quits. Its
 * lock is in the data folder, so after a dev run has moved that.
 */
const primaryInstance = claimSingleInstance(app);
/** @type {ReturnType<typeof setUpDesktop> | undefined} */
let desktop;
/**
 * Launch options for a test run (src/services/launchOptions), as JSON: the
 * app's root props, as Android's launch extras are. Development only.
 */
const launchOptions = dev
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
  (dev && process.env.LEARNX_WEB_DIR) || path.join(__dirname, 'web'),
);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

const webviews = createWebviews({
  openExternal: url => {
    shell.openExternal(url).catch(() => {});
  },
});

/**
 * @param {Electron.Session} ses
 */
const handleIpc = ses => {
  const store = createFileStore(path.join(app.getPath('userData'), 'storage'));
  const secrets = createSecrets(
    createFileStore(app.getPath('userData')),
    safeStorage,
  );

  // Key-value storage. A database is read once, synchronously, when the
  // renderer first opens it; writes are sent in order without waiting.
  ipcMain.on('storage:load', (event, db) => {
    fromApp(event);
    event.returnValue = store.readAll(db);
  });
  const writes = loggedWrites(store, message =>
    console.error(`[storage] ${message}`),
  );
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
  const inFlight = new Map();
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
  ipcMain.handle('cookies:flush', event => {
    fromApp(event);
    return ses.cookies.flushStore();
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
  desktop = setUpDesktop({
    electron: require('electron'),
    fromApp,
    files,
    cacheDir: path.join(app.getPath('userData'), 'Files', 'Caches'),
    iconFile,
    dev,
  });
  ipcMain.on('files', (event, op, ...args) => {
    fromApp(event);
    event.returnValue = runFileOperation(files, op, args);
  });
  /** Downloads in flight, by the renderer's id, so it can abort them. */
  const downloads = new Map();
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
  // From a web view's own preload (webviewPreload.cjs).
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
  __dirname,
  'icons',
  process.platform === 'win32' ? 'icon.ico' : 'icon.png',
);

/** How many times a crashed page is loaded again before it's left. */
const MAX_PAGE_RELOADS = 3;

/**
 * The window, on the app's own session (`ses`, which serves app://), where it
 * was last time (windowState.cjs).
 */
const createWindow = (/** @type {Electron.Session} */ ses) => {
  const stateFile = path.join(app.getPath('userData'), 'window-state.json');
  const { screen } = require('electron');
  const state = loadWindowState(
    stateFile,
    screen.getAllDisplays().map(display => display.workArea),
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
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // The page's web views (webviews.cjs), hardened as they attach.
      webviewTag: true,
      spellcheck: false,
      // Captures need frames drawn while the window is in the background.
      backgroundThrottling: !captureDir,
    },
  });
  if (state.maximized) {
    win.maximize();
  }
  win.on('close', () => saveWindowState(stateFile, win));
  // The window is learnX, whichever screen the app names in the page title.
  win.on('page-title-updated', event => event.preventDefault());
  // A crashed page (out of memory, a GPU fault) is loaded again rather than
  // left blank in the tray, a few times at most.
  let reloads = 0;
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[window] page gone: ${details.reason}`);
    if (details.reason !== 'clean-exit' && reloads < MAX_PAGE_RELOADS) {
      reloads += 1;
      void win.loadURL(`${ORIGIN}/`);
    }
  });
  // Start at login on Windows starts learnX in the tray.
  win.once('ready-to-show', () => desktop?.startsHidden() || win.show());

  // Links open in the browser; the window itself never leaves the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      void shell.openExternal(url);
    }
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
        path.join(__dirname, 'webviewPreload.cjs'),
        { backgroundThrottling: !captureDir },
      )
    ) {
      event.preventDefault();
    }
  });
  win.webContents.on('did-attach-webview', (_event, guest) =>
    webviews.guard(guest),
  );
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

// The version, the About panel and updates (buildInfo.cjs, updater.cjs). A
// packaged build carries its build number and where it looks for updates in
// its package.json (written by packageConfig.cjs), and the certificate of the
// key its update files are signed with; a dev run reads the checkout's, and
// checks for updates only on a local test server at `LEARNX_UPDATE_URL`
// (updateServer.mjs), signed by the key of `LEARNX_UPDATE_CERTIFICATE` if set.
const packaged = /** @type {{ buildNumber?: string; updateUrl?: string }} */ (
  require('./package.json')
);
const buildInfo = dev
  ? readBuildInfo(path.join(__dirname, '..'))
  : { version: app.getVersion(), build: packaged.buildNumber ?? '' };
const devUpdateUrl = dev ? process.env.LEARNX_UPDATE_URL : undefined;
/** A dev run's updater log lines, for the E2E tests (`learnxUpdaterLog`). */
const devUpdaterLog = dev ? /** @type {string[]} */ ([]) : undefined;
if (devUpdaterLog) {
  Object.assign(globalThis, { learnxUpdaterLog: devUpdaterLog });
}
const updater =
  // E2E runs (electron/e2e) turn checks off with LEARNX_NO_UPDATES, and a
  // second launch only hands its arguments over.
  !process.env.LEARNX_NO_UPDATES &&
  primaryInstance &&
  (devUpdateUrl ||
    updatesSupported({
      dev,
      platform: process.platform,
      env: process.env,
      hasUpdateConfig:
        !!packaged.updateUrl &&
        fs.existsSync(path.join(process.resourcesPath, 'app-update.yml')),
    }))
    ? (() => {
        const { autoUpdater } = require('electron-updater');
        if (devUpdateUrl && devDataDir) {
          // What electron-builder writes into a packaged build's
          // app-update.yml: where updates come from, here the test server,
          // and the cache folder's name.
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
          // Its downloads stay in the data folder too, not in the system's
          // caches (~/Library/Caches/learnX, %LOCALAPPDATA%, ~/.cache): the
          // app adapter's (protected) cache folder, which it reads them under.
          Object.defineProperty(
            /** @type {any} */ (autoUpdater).app,
            'baseCachePath',
            {
              value: path.join(devDataDir, 'updates'),
            },
          );
          // The checkout's version, not this folder's package.json's (0.0.0),
          // as electron-updater's own copy of semver parses it.
          const semver = require(
            require.resolve('semver', {
              paths: [path.dirname(require.resolve('electron-updater'))],
            }),
          );
          Object.assign(autoUpdater, {
            currentVersion: semver.parse(buildInfo.version),
          });
        }
        const certificate = fs.readFileSync(
          dev
            ? process.env.LEARNX_UPDATE_CERTIFICATE ||
                path.join(__dirname, '..', 'certs', 'ota-certificate.pem')
            : path.join(__dirname, 'ota-certificate.pem'),
        );
        return createUpdater({
          autoUpdater,
          feed: {
            url: devUpdateUrl || packaged.updateUrl || '',
            provider: signedProvider({
              GenericProvider:
                require('electron-updater/out/providers/GenericProvider')
                  .GenericProvider,
              parseUpdateInfo:
                require('electron-updater/out/providers/Provider')
                  .parseUpdateInfo,
              ...require('electron-updater/out/util'),
              certificate,
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
        });
      })()
    : null;
ipcMain.on('app:info', event => {
  fromApp(event);
  event.returnValue = buildInfo;
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

void app.whenReady().then(() => {
  app.setAboutPanelOptions(aboutPanelOptions(buildInfo, iconFile));
  updater?.start();
});

void app.whenReady().then(() => {
  if (!primaryInstance) {
    return;
  }
  // The web views' session (PARTITION), whose cookies the app's requests use
  // too, and the window's own, in memory, the only one that serves app://:
  // a page in a web view (a notice's HTML) can't load the app's scripts or
  // another download's preview.
  const ses = session.fromPartition(PARTITION);
  const appSession = session.fromPartition(APP_PARTITION);
  appSession.protocol.handle(
    'app',
    createServeApp({
      webDir,
      fetchFile: url => net.fetch(url),
      servePreview: () => desktop?.servePreview,
    }),
  );
  // No camera, microphone, location or notifications asked of the system;
  // a web view's page may only go full screen and copy (webviews.cjs).
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

// Closing the window hides it (desktop.cjs); with the window gone, so is
// learnX.
app.on('window-all-closed', () => app.quit());
