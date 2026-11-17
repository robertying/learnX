// main.cjs and preload.cjs with a stand-in for Electron: what the main
// process sets up, and that every IPC channel the page uses is handled and
// refuses callers other than the app's own page.
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

/** Just enough of Electron for main.cjs, system.cjs and preload.cjs. */
const fakeElectron = (dataDir: string, { packaged = false } = {}) => {
  const paths = new Map<string, string>([
    ['userData', dataDir],
    ['downloads', dataDir],
  ]);
  const app = Object.assign(new EventEmitter(), {
    isPackaged: packaged,
    setName: jest.fn(),
    setAppUserModelId: jest.fn(),
    getPath: (name: string) => paths.get(name) ?? path.join(dataDir, name),
    setPath: jest.fn((name: string, value: string) => paths.set(name, value)),
    commandLine: { appendSwitch: jest.fn() },
    requestSingleInstanceLock: () => true,
    quit: jest.fn(),
    whenReady: () => Promise.resolve(),
    getVersion: () => '19.0.0',
    getAppPath: () => path.join(__dirname, '..'),
    setAboutPanelOptions: jest.fn(),
    setUserTasks: jest.fn(),
    getLoginItemSettings: () => ({ openAtLogin: false }),
    setLoginItemSettings: jest.fn(),
  });
  const handlers = new Map<string, Handler>();
  const ipcMain = {
    on: (channel: string, handler: Handler) => handlers.set(channel, handler),
    handle: (channel: string, handler: Handler) =>
      handlers.set(channel, handler),
  };
  const windows: FakeWindow[] = [];
  class FakeWebContents extends EventEmitter {
    loadURL = jest.fn<Promise<void>, [string]>(async () => {});
    send = jest.fn();
    windowOpenHandler?: (details: { url: string }) => { action: string };
    isDestroyed = () => false;
    zoomLevel = 0;
    getZoomLevel = () => this.zoomLevel;
    setZoomLevel = jest.fn((level: number) => {
      this.zoomLevel = level;
    });
    setWindowOpenHandler(handler: FakeWebContents['windowOpenHandler']) {
      this.windowOpenHandler = handler;
    }
  }
  class FakeWindow extends EventEmitter {
    static getAllWindows = () => windows;
    static fromWebContents = () => windows[0] ?? null;
    webContents = new FakeWebContents();
    maximize = jest.fn();
    show = jest.fn();
    hide = jest.fn();
    focus = jest.fn();
    isDestroyed = () => false;
    isMinimized = () => false;
    isMaximized = () => false;
    getNormalBounds = () => ({ x: 10, y: 20, width: 900, height: 700 });
    loadURL = (url: string) => this.webContents.loadURL(url);
    constructor(readonly options: Record<string, any>) {
      super();
      windows.push(this);
      app.emit('browser-window-created', {}, this);
    }
  }
  const sessions = new Map<string, ReturnType<typeof fakeSession>>();
  const fakeSession = () => ({
    protocol: { handle: jest.fn() },
    setPermissionRequestHandler: jest.fn(),
    setPermissionCheckHandler: jest.fn(),
    setCodeCachePath: jest.fn(),
    webRequest: { onBeforeRequest: jest.fn() },
    cookies: {
      get: jest.fn(async () => [{ name: 'JSESSIONID', value: 'x' }]),
      set: jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
      flushStore: jest.fn(async () => {}),
    },
    clearStorageData: jest.fn(async () => {}),
  });
  const contextBridge = { exposeInMainWorld: jest.fn() };
  const ipcRenderer = {
    invoke: jest.fn(),
    send: jest.fn(),
    sendSync: jest.fn(),
    on: jest.fn(),
  };
  const electron = {
    app,
    ipcMain,
    BrowserWindow: FakeWindow,
    Menu: {
      setApplicationMenu: jest.fn(),
      buildFromTemplate: (template: unknown[]) => ({
        items: template,
        popup: ({ callback }: { callback: () => void }) => callback(),
      }),
    },
    nativeTheme: { shouldUseDarkColors: false },
    net: { fetch: jest.fn(), request: jest.fn() },
    protocol: { registerSchemesAsPrivileged: jest.fn() },
    safeStorage: {
      isAsyncEncryptionAvailable: async () => true,
      getSelectedStorageBackend: () => 'gnome_libsecret',
      encryptStringAsync: async (text: string) => Buffer.from(text).reverse(),
      decryptStringAsync: async (data: Buffer) => ({
        result: Buffer.from(data).reverse().toString(),
        shouldReEncrypt: false,
      }),
    },
    session: {
      fromPartition: (name: string) => {
        if (!sessions.has(name)) {
          sessions.set(name, fakeSession());
        }
        return sessions.get(name)!;
      },
    },
    shell: { openExternal: jest.fn(async () => {}) },
    webContents: { fromId: () => undefined, getAllWebContents: () => [] },
    screen: {
      getAllDisplays: () => [
        { workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
      ],
    },
    dialog: {},
    clipboard: {},
    Tray: class {
      setToolTip() {}
      setContextMenu() {}
      on() {}
      destroy() {}
    },
    Notification: class {
      static isSupported = () => true;
    },
    nativeImage: { createFromPath: () => ({ resize: () => ({}) }) },
    powerMonitor: new EventEmitter(),
    // Squirrel.Mac's, which electron-updater's MacUpdater wraps.
    autoUpdater: Object.assign(new EventEmitter(), {
      setFeedURL: jest.fn(),
      checkForUpdates: jest.fn(),
    }),
    contextBridge,
    ipcRenderer,
  };
  return {
    electron,
    app,
    handlers,
    windows,
    sessions,
    contextBridge,
    ipcRenderer,
  };
};

let dataDir: string;
let fake: ReturnType<typeof fakeElectron>;

/** Loads main.cjs on the stand-in, and lets its `whenReady` work run. */
const loadMain = async (options?: { packaged?: boolean }) => {
  fake = fakeElectron(dataDir, options);
  jest.resetModules();
  jest.doMock('electron', () => fake.electron, { virtual: true });
  require('../main.cjs');
  await new Promise(resolve => setImmediate(resolve));
  return fake;
};

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-main-'));
  jest.replaceProperty(process, 'env', {
    ...process.env,
    LEARNX_DATA_DIR: dataDir,
    LEARNX_NO_UPDATES: '1',
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.dontMock('electron');
  fs.rmSync(dataDir, { recursive: true, force: true });
  delete (globalThis as Record<string, unknown>).learnxDev;
  delete (globalThis as Record<string, unknown>).learnxUpdaterLog;
});

/** An IPC event from `type` (a window or a web view) at `url`. */
const eventFrom = (type: string, url: string) => ({
  sender: { getType: () => type },
  senderFrame: { url, parent: null },
  returnValue: undefined as unknown,
});

/** Every function in the page's API, with the channels each uses. */
const preloadChannels = () => {
  require('../preload.cjs');
  const [[name, api]] = fake.contextBridge.exposeInMainWorld.mock.calls;
  expect(name).toBe('learnx');
  const call = (value: unknown) => {
    if (typeof value === 'function') {
      value(() => {}, 'b', 'c');
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(call);
    }
  };
  call(api);
  const sent = [
    ...fake.ipcRenderer.invoke.mock.calls,
    ...fake.ipcRenderer.send.mock.calls,
    ...fake.ipcRenderer.sendSync.mock.calls,
  ].map(([channel]) => channel as string);
  const listened = fake.ipcRenderer.on.mock.calls.map(
    ([channel]) => channel as string,
  );
  return { sent: new Set(sent), listened: new Set(listened) };
};

describe('IPC', () => {
  it('handles every channel the page sends on', async () => {
    await loadMain();
    const { sent } = preloadChannels();
    for (const channel of sent) {
      expect([channel, fake.handlers.has(channel)]).toEqual([channel, true]);
    }
  });

  it('refuses every caller but the app’s page, except a web view’s own scripts', async () => {
    await loadMain();
    const outside = [
      eventFrom('webview', 'https://learn.tsinghua.edu.cn/'),
      eventFrom('window', 'https://evil.example/'),
    ];
    for (const [channel, handler] of fake.handlers) {
      if (channel === 'webview:scripts') {
        continue;
      }
      for (const event of outside) {
        let error: unknown;
        try {
          await handler(event, 'a', 'b', 'c');
        } catch (thrown) {
          error = thrown;
        }
        expect([channel, String(error)]).toEqual([
          channel,
          'Error: IPC from outside the app',
        ]);
      }
    }
  });

  it('answers the page', async () => {
    await loadMain();
    const event = eventFrom('window', 'app://learnx/');
    fake.handlers.get('app:info')!(event);
    expect(event.returnValue).toEqual({
      version: expect.any(String),
      build: expect.any(String),
    });
    fake.handlers.get('files')!(event, 'roots');
    expect(event.returnValue).toEqual({
      result: {
        cache: expect.stringMatching(/Files\/Caches\/$/),
        document: expect.stringMatching(/Files\/Documents\/$/),
      },
    });
    fake.handlers.get('storage:set')!(event, 'settings', 'theme', 'dark');
    fake.handlers.get('storage:load')!(event, 'settings');
    expect(event.returnValue).toEqual({ theme: 'dark' });
    fake.handlers.get('updates:pending')!(event);
    expect(event.returnValue).toBeNull();
    fake.handlers.get('launchOptions')!(event);
    expect(event.returnValue).toEqual({});
  });
});

describe('the page’s other calls', () => {
  const app = () =>
    Object.assign(eventFrom('window', 'app://learnx/'), {
      sender: {
        getType: () => 'window',
        isDestroyed: () => false,
        send: jest.fn(),
      },
    });
  const call = async (channel: string, ...args: unknown[]) =>
    fake.handlers.get(channel)!(app(), ...args);

  it('keeps the saved login encrypted', async () => {
    await loadMain();
    await call('secrets:set', 'credentials', 'secret');
    await expect(call('secrets:get', 'credentials')).resolves.toBe('secret');
    expect(
      fs.readFileSync(
        path.join(dataDir, 'userData', 'secrets', 'credentials'),
        'utf8',
      ),
    ).not.toContain('secret');
    await call('secrets:remove', 'credentials');
    await expect(call('secrets:get', 'credentials')).resolves.toBeNull();
  });

  it('removes and clears stored values', async () => {
    await loadMain();
    const event = app();
    const handle = (channel: string, ...args: unknown[]) =>
      fake.handlers.get(channel)!(event, ...args);
    handle('storage:set', 'settings', 'a', '1');
    handle('storage:set', 'settings', 'b', '2');
    handle('storage:remove', 'settings', 'a');
    handle('storage:load', 'settings');
    expect(event.returnValue).toEqual({ b: '2' });
    handle('storage:clear', 'settings');
    handle('storage:load', 'settings');
    expect(event.returnValue).toEqual({});
  });

  it('works the cookies of the web views’ session', async () => {
    await loadMain();
    const { cookies, clearStorageData } = fake.sessions.get('persist:learnx')!;
    await expect(
      call('cookies:get', 'https://learn.tsinghua.edu.cn/'),
    ).resolves.toEqual([{ name: 'JSESSIONID', value: 'x' }]);
    await call('cookies:set', { url: 'https://x', name: 'a' });
    await call('cookies:remove', 'https://x', 'a');
    await call('cookies:flush');
    await call('cookies:clearAll');
    expect(cookies.set).toHaveBeenCalledWith({ url: 'https://x', name: 'a' });
    expect(cookies.remove).toHaveBeenCalledWith('https://x', 'a');
    expect(cookies.flushStore).toHaveBeenCalled();
    expect(clearStorageData).toHaveBeenCalledWith({ storages: ['cookies'] });
  });

  it('refuses requests and downloads off the allowed sites', async () => {
    await loadMain();
    await expect(
      call('fetch', 1, {
        url: 'https://example.com/',
        method: 'GET',
        headers: [],
      }),
    ).rejects.toThrow('Not an allowed URL: https://example.com/');
    await call('fetch:abort', 1);
    const { cache } = (() => {
      const event = app();
      fake.handlers.get('files')!(event, 'roots');
      return (event.returnValue as { result: { cache: string } }).result;
    })();
    await expect(
      call('files:download', 2, {
        url: 'https://example.com/a',
        uri: `${cache}a`,
      }),
    ).rejects.toThrow('Not an allowed URL');
    await call('files:abortDownload', 2);
  });

  it('shows a native menu and answers with the item chosen', async () => {
    await loadMain();
    await expect(
      call('menu:popup', [{ id: 'a', label: 'A' }], { x: 1, y: 2 }),
    ).resolves.toBeNull();
  });

  it('configures only its own web views, and captures only in a dev run that asks', async () => {
    await loadMain();
    await expect(call('webview:configure', 7, {})).resolves.toBe(false);
    await expect(
      call('webview:loadHtml', 7, '<p>', 'https://learn.tsinghua.edu.cn/'),
    ).resolves.toBe(false);
    await call('webview:answer', 1, true);
    const scripts = {
      returnValue: undefined as unknown,
      sender: { getType: () => 'webview', id: 3 },
    };
    fake.handlers.get('webview:scripts')!(scripts);
    expect(scripts.returnValue).toEqual({});
    await expect(call('capture', 'today')).resolves.toBeNull();
    await call('updates:install');
  });
});

describe('the window', () => {
  it('shows the app on a session of its own, the only one serving app://', async () => {
    await loadMain();
    const [win] = fake.windows;
    expect(win.webContents.loadURL).toHaveBeenCalledWith('app://learnx/');
    const appSession = fake.sessions.get('persist:learnx-app')!;
    const webviewSession = fake.sessions.get('persist:learnx')!;
    expect(win.options.webPreferences).toMatchObject({
      session: appSession,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.cjs'),
    });
    expect(appSession.protocol.handle).toHaveBeenCalledWith(
      'app',
      expect.any(Function),
    );
    expect(webviewSession.protocol.handle).not.toHaveBeenCalled();
    // The web build's compiled code is kept for the next launch.
    expect(appSession.setCodeCachePath).toHaveBeenCalledWith(
      path.join(dataDir, 'userData', 'Code Cache'),
    );
    expect(
      fake.electron.protocol.registerSchemesAsPrivileged.mock.calls[0][0][0]
        .privileges,
    ).toMatchObject({ standard: true, codeCache: true });
    expect(webviewSession.webRequest.onBeforeRequest).toHaveBeenCalled();
  });

  it('asks the system for nothing but a web view’s full screen and copy', async () => {
    await loadMain();
    const webview = { getType: () => 'webview', isDestroyed: () => false };
    const ask = (session: string, permission: string, url: string) =>
      new Promise(resolve =>
        fake.sessions
          .get(session)!
          .setPermissionRequestHandler.mock.calls[0][0](
            webview,
            permission,
            resolve,
            { requestingUrl: url },
          ),
      );
    const notice = 'https://learn.tsinghua.edu.cn/';
    await expect(ask('persist:learnx', 'fullscreen', notice)).resolves.toBe(
      true,
    );
    await expect(ask('persist:learnx', 'media', notice)).resolves.toBe(false);
    await expect(ask('persist:learnx-app', 'fullscreen', notice)).resolves.toBe(
      false,
    );
    const check = (session: string) =>
      fake.sessions
        .get(session)!
        .setPermissionCheckHandler.mock.calls[0][0](
          webview,
          'fullscreen',
          notice,
        );
    expect(check('persist:learnx')).toBe(true);
    expect(check('persist:learnx-app')).toBe(false);
  });

  it('stays on the app, and opens links in the browser', async () => {
    await loadMain();
    const { webContents } = fake.windows[0];
    expect(webContents.windowOpenHandler!({ url: 'https://x.test/' })).toEqual({
      action: 'deny',
    });
    expect(fake.electron.shell.openExternal).toHaveBeenCalledWith(
      'https://x.test/',
    );
    webContents.windowOpenHandler!({ url: 'file:///etc/hosts' });
    expect(fake.electron.shell.openExternal).toHaveBeenCalledTimes(1);

    const navigate = (url: string) => {
      const event = { preventDefault: jest.fn() };
      webContents.emit('will-navigate', event, url);
      return event.preventDefault.mock.calls.length > 0;
    };
    expect(navigate('app://learnx/today')).toBe(false);
    expect(navigate('https://learn.tsinghua.edu.cn/')).toBe(true);

    const attach = (params: Record<string, string>) => {
      const event = { preventDefault: jest.fn() };
      webContents.emit('will-attach-webview', event, {}, params);
      return event.preventDefault.mock.calls.length === 0;
    };
    expect(attach({ src: 'about:blank', partition: 'persist:learnx' })).toBe(
      true,
    );
    expect(
      attach({ src: 'https://x.test/', partition: 'persist:learnx' }),
    ).toBe(false);
  });

  it('loads a crashed page again, a few times at most', async () => {
    await loadMain();
    const { webContents } = fake.windows[0];
    webContents.loadURL.mockClear();
    webContents.emit('render-process-gone', {}, { reason: 'clean-exit' });
    for (let crash = 0; crash < 5; crash += 1) {
      webContents.emit('render-process-gone', {}, { reason: 'crashed' });
    }
    expect(webContents.loadURL).toHaveBeenCalledTimes(3);
  });

  it('comes back where it was', async () => {
    await loadMain();
    const [win] = fake.windows;
    expect(win.options).toMatchObject({ width: 1200, height: 800 });
    win.emit('close', { preventDefault: () => {} });
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(dataDir, 'userData', 'window-state.json'),
          'utf8',
        ),
      ),
    ).toEqual({
      bounds: { x: 10, y: 20, width: 900, height: 700 },
      maximized: false,
      zoom: 0,
    });
    await loadMain();
    expect(fake.windows[0].options).toMatchObject({
      x: 10,
      y: 20,
      width: 900,
      height: 700,
      minWidth: 360,
    });
  });

  const saveState = (state: object) => {
    fs.mkdirSync(path.join(dataDir, 'userData'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'userData', 'window-state.json'),
      JSON.stringify({
        bounds: { x: 10, y: 20, width: 900, height: 700 },
        ...state,
      }),
    );
  };

  it('shows a window saved maximized maximized, once it’s ready', async () => {
    saveState({ maximized: true });
    await loadMain();
    const [win] = fake.windows;
    expect(win.maximize).not.toHaveBeenCalled();
    win.emit('ready-to-show');
    expect(win.maximize).toHaveBeenCalled();
    expect(win.show).not.toHaveBeenCalled();
  });

  it('keeps a window saved maximized in the tray at Start at login, maximized when it comes out', async () => {
    saveState({ maximized: true });
    jest.replaceProperty(process, 'argv', [...process.argv, '--hidden']);
    await loadMain();
    const [win] = fake.windows;
    win.emit('ready-to-show');
    expect(win.maximize).not.toHaveBeenCalled();
    expect(win.show).not.toHaveBeenCalled();
    win.emit('show');
    expect(win.maximize).toHaveBeenCalledTimes(1);
  });

  it('zooms from the keyboard, and keeps the zoom', async () => {
    saveState({ maximized: false, zoom: 1 });
    await loadMain();
    const [win] = fake.windows;
    win.webContents.emit('did-finish-load');
    expect(win.webContents.setZoomLevel).toHaveBeenLastCalledWith(1);
    const key = (input: object) => {
      const event = { preventDefault: jest.fn() };
      win.webContents.emit('before-input-event', event, {
        type: 'keyDown',
        control: process.platform !== 'darwin',
        meta: process.platform === 'darwin',
        alt: false,
        ...input,
      });
      return event.preventDefault.mock.calls.length > 0;
    };
    expect(key({ key: '=' })).toBe(true);
    expect(win.webContents.zoomLevel).toBe(1.5);
    expect(key({ key: 'a' })).toBe(false);
    // A reload (after a crash) keeps it.
    win.webContents.emit('did-finish-load');
    expect(win.webContents.setZoomLevel).toHaveBeenLastCalledWith(1.5);
    win.emit('close', { preventDefault: () => {} });
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(dataDir, 'userData', 'window-state.json'),
          'utf8',
        ),
      ).zoom,
    ).toBe(1.5);
  });
});

describe('the application menu', () => {
  it('is Electron’s in a dev run, for Developer Tools', async () => {
    await loadMain();
    expect(fake.electron.Menu.setApplicationMenu).not.toHaveBeenCalled();
    expect(fake.app.commandLine.appendSwitch).toHaveBeenCalledWith(
      'use-mock-keychain',
    );
  });

  it('is gone from a packaged build', async () => {
    await loadMain({ packaged: true });
    expect(fake.electron.Menu.setApplicationMenu).toHaveBeenCalledWith(null);
    // A packaged build ignores the dev runner's data folder.
    expect(fake.app.commandLine.appendSwitch).not.toHaveBeenCalled();
  });
});

it('exposes the page’s API with nothing it doesn’t handle', async () => {
  await loadMain();
  const { listened } = preloadChannels();
  // What the main process sends the page.
  expect([...listened].sort((a, b) => a.localeCompare(b))).toEqual([
    'background:run',
    'files:progress',
    'notifications:devShown',
    'notifications:response',
    'system:open',
    'updates:ready',
    'webview:ask',
  ]);
});

describe('updates', () => {
  it('checks a dev run’s test server, through the signature check, and logs', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      jest.replaceProperty(process, 'env', {
        ...process.env,
        LEARNX_NO_UPDATES: '',
        LEARNX_UPDATE_URL: 'http://127.0.0.1:1/',
      });
      await loadMain();
      // electron-updater's config for the test server, in the data folder.
      expect(
        fs.readFileSync(path.join(dataDir, 'app-update.yml'), 'utf8'),
      ).toContain('url: http://127.0.0.1:1/');
      const event = eventFrom('window', 'app://learnx/');
      fake.handlers.get('updates:pending')!(event);
      expect(event.returnValue).toBeNull();
      expect(
        (globalThis as { learnxUpdaterLog?: string[] }).learnxUpdaterLog,
      ).toEqual([]);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
