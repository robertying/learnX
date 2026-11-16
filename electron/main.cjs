// learnX's Electron main process: one window showing the app's web build,
// served from app://learnx/, and the services the renderer asks for over IPC
// (preload.cjs): requests to Tsinghua's servers, their cookies, key-value
// storage and the saved login.
//
// It registers nothing with the system: no protocol handler, no login item.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  net,
  protocol,
  safeStorage,
  session,
  shell,
} = require('electron');
const { createFileStore } = require('./fileStore.cjs');
const { mainFetch } = require('./net.cjs');
const { createSecrets } = require('./secrets.cjs');

/** Not the iOS bundle id, which the Mac Catalyst app has on a Mac. */
const APP_ID = 'io.robertying.learnX.electron';
const ORIGIN = 'app://learnx';

app.setName('learnX');
if (process.platform === 'win32') {
  // Groups the taskbar button and notifications under learnX.
  app.setAppUserModelId(APP_ID);
}

// The dev runner (dev.mjs) keeps everything Electron writes in one folder
// and out of the system's keychain.
const devDataDir = app.isPackaged ? undefined : process.env.LEARNX_DATA_DIR;
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
const launchOptions = app.isPackaged
  ? {}
  : JSON.parse(process.env.LEARNX_LAUNCH_OPTIONS || '{}');
/** Where dev captures go (`learnx.capture` in the renderer), if anywhere. */
const captureDir = app.isPackaged ? undefined : process.env.LEARNX_CAPTURE_DIR;

/** The web build: next to this file when packaged, or the dev runner's. */
const webDir = path.resolve(
  (!app.isPackaged && process.env.LEARNX_WEB_DIR) ||
    path.join(__dirname, 'web'),
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

/** Only the app's own pages may call the main process. */
const fromApp = (
  /** @type {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} */ event,
) => {
  if (!event.senderFrame?.url.startsWith(`${ORIGIN}/`)) {
    throw new Error('IPC from outside the app');
  }
};

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
      webviewTag: false,
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
  if (!app.isPackaged) {
    win.webContents.on('console-message', ({ level, message }) => {
      if (level === 'warning' || level === 'error') {
        console.log(`[renderer ${level}] ${message}`);
      }
    });
  }
  void win.loadURL(`${ORIGIN}/`);
  return win;
};

void app.whenReady().then(() => {
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(path.join(__dirname, 'icons', 'icon.png'));
  }
  const ses = session.fromPartition('persist:learnx');
  ses.protocol.handle('app', serveWeb);
  // No camera, microphone, location or notifications asked of the system yet.
  ses.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  handleIpc(ses);
  createWindow(ses);
});

// Closing the window quits, on macOS too (only used there in development).
app.on('window-all-closed', () => app.quit());
