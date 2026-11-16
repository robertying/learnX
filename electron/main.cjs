// learnX's Electron main process: one window showing the app's web build,
// served from app://learnx/, and the services the renderer asks for over IPC
// (preload.cjs): requests to Tsinghua's servers, their cookies, key-value
// storage, the saved login, the app's own files and downloads, native menus
// and the web views the page shows (webviews.cjs).
//
// It registers nothing with the system: no protocol handler, no login item.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
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
const { aboutPanelOptions, readBuildInfo } = require('./buildInfo.cjs');
const { createFileStore } = require('./fileStore.cjs');
const { createFiles } = require('./files.cjs');
const { popupMenu } = require('./menus.cjs');
const { mainFetch } = require('./net.cjs');
const { createReleasesProvider } = require('./releasesProvider.cjs');
const { createSecrets } = require('./secrets.cjs');
const { createUpdater, updatesSupported } = require('./updater.cjs');
const { PARTITION, createWebviews, hardenWebview } = require('./webviews.cjs');

/**
 * A top-level app's id, named as the repo's other top-level targets are
 * (`io.robertying.learnXTests`): `io.robertying.learnX.<name>` is for the iOS
 * app's extensions, and the iOS bundle id is the Mac Catalyst app's on a Mac.
 */
const APP_ID = 'io.robertying.learnXElectron';
const ORIGIN = 'app://learnx';

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

// Scripts and styles only from the app itself (React Native Web sets styles
// inline), images from anywhere over https (course pictures, avatars).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

/** Serves the web build, and index.html for any path that isn't a file. */
const serveWeb = async (/** @type {Request} */ request) => {
  const { pathname } = new URL(request.url);
  const file = path.join(webDir, decodeURIComponent(pathname));
  const target =
    file.startsWith(webDir + path.sep) &&
    fs.existsSync(file) &&
    fs.statSync(file).isFile()
      ? file
      : path.join(webDir, 'index.html');
  const response = await net.fetch(pathToFileURL(target).toString());
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  return new Response(response.body, { status: response.status, headers });
};

/**
 * Only the app's own pages may call the main process: its window, never a
 * web view it shows.
 */
const fromApp = (
  /** @type {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} */ event,
) => {
  if (
    event.sender.getType() !== 'window' ||
    !event.senderFrame?.url.startsWith(`${ORIGIN}/`)
  ) {
    throw new Error('IPC from outside the app');
  }
};

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
  ipcMain.on('storage:set', (event, db, key, value) => {
    fromApp(event);
    store.setItem(db, key, value);
  });
  ipcMain.on('storage:remove', (event, db, key) => {
    fromApp(event);
    store.removeItem(db, key);
  });
  ipcMain.on('storage:clear', (event, db) => {
    fromApp(event);
    store.clear(db);
  });

  ipcMain.handle('secrets:get', (event, key) => {
    fromApp(event);
    return secrets.get(key);
  });
  ipcMain.handle('secrets:set', (event, key, value) => {
    fromApp(event);
    secrets.set(key, value);
  });
  ipcMain.handle('secrets:remove', (event, key) => {
    fromApp(event);
    secrets.remove(key);
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
  ipcMain.on('files', (event, op, ...args) => {
    fromApp(event);
    try {
      switch (op) {
        case 'roots':
          event.returnValue = { result: files.roots() };
          return;
        case 'info':
        case 'list':
        case 'makeDirectory':
        case 'remove':
        case 'move':
        case 'copy':
        case 'write':
        case 'read':
          event.returnValue = {
            result: /** @type {any} */ (files[op])(...args),
          };
          return;
        default:
          throw new Error(`Unknown file operation: ${op}`);
      }
    } catch (error) {
      event.returnValue = {
        error: String(/** @type {Error} */ (error).message),
      };
    }
  });
  /** Downloads in flight, by the renderer's id, so it can abort them. */
  const downloads = new Map();
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

const createWindow = (/** @type {Electron.Session} */ ses) => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 360,
    minHeight: 480,
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
  // The window is learnX, whichever screen the app names in the page title.
  win.on('page-title-updated', event => event.preventDefault());
  win.once('ready-to-show', () => win.show());

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
// packaged build carries its build number in its package.json (written by
// packageConfig.cjs), and where it looks for updates; a dev run
// reads the checkout's, and checks for updates only at `LEARNX_UPDATE_URL`
// (a local test server, updateServer.mjs).
const packaged = /** @type {{ buildNumber?: string; updateUrl?: string }} */ (
  require('./package.json')
);
const buildInfo = dev
  ? readBuildInfo(path.join(__dirname, '..'))
  : { version: app.getVersion(), build: packaged.buildNumber ?? '' };
// E2E runs (electron/e2e) turn checks off with LEARNX_NO_UPDATES.
const updateUrl = process.env.LEARNX_NO_UPDATES
  ? undefined
  : dev
    ? process.env.LEARNX_UPDATE_URL
    : packaged.updateUrl;
const updater =
  updateUrl &&
  (dev ||
    updatesSupported({ dev, platform: process.platform, env: process.env }))
    ? (() => {
        const { autoUpdater } = require('electron-updater');
        if (dev && devDataDir) {
          // electron-updater reads its cache folder's name from the update
          // config electron-builder writes into packaged builds.
          const config = path.join(devDataDir, 'app-update.yml');
          fs.writeFileSync(config, 'updaterCacheDirName: learnX\n');
          autoUpdater.updateConfigPath = config;
          autoUpdater.forceDevUpdateConfig = true;
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
        return createUpdater({
          autoUpdater,
          feed: {
            provider: 'custom',
            updateProvider: createReleasesProvider(
              require('electron-updater/out/providers/Provider'),
            ),
            url: updateUrl,
          },
          onReady: update => {
            for (const win of BrowserWindow.getAllWindows()) {
              win.webContents.send('updates:ready', update);
            }
          },
          log: message => console.log(`[updater] ${message}`),
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
void app.whenReady().then(() => {
  app.setAboutPanelOptions(
    aboutPanelOptions(buildInfo, app.getLocale(), iconFile),
  );
  updater?.start();
});

void app.whenReady().then(() => {
  const ses = session.fromPartition(PARTITION);
  ses.protocol.handle('app', serveWeb);
  // No camera, microphone, location or notifications asked of the system yet.
  ses.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  // The web views' top-level loads wait for the page to decide on them.
  ses.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'], types: ['mainFrame'] },
    webviews.onBeforeRequest,
  );
  handleIpc(ses);
  createWindow(ses);
});

// Closing the window quits, on macOS too (only used there in development).
app.on('window-all-closed', () => app.quit());
