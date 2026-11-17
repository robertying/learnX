import { EventEmitter } from 'node:events';
import {
  DEFAULT_LABELS,
  HIDDEN_ARG,
  OPEN_ARG,
  SYNC_INTERVAL_MS,
  claimSingleInstance,
  loginItemSupported,
  openTargetOf,
  setUpDesktop,
} from '../desktop.cjs';

type Handler = (event: unknown, ...args: unknown[]) => unknown;
type MenuItem = { label?: string; type?: string; click?: () => void };

/** A window as desktop.cjs uses one. */
class FakeWindow extends EventEmitter {
  visible = true;
  minimized = true;
  webContents = { send: jest.fn(), isDestroyed: () => false };
  isDestroyed = () => false;
  isMinimized = () => this.minimized;
  restore = jest.fn(() => {
    this.minimized = false;
  });
  show = jest.fn(() => {
    this.visible = true;
  });
  hide = jest.fn(() => {
    this.visible = false;
  });
  focus = jest.fn();
}

/** Just enough of Electron for desktop.cjs, recording what it's asked. */
const fakeElectron = () => {
  const app = Object.assign(new EventEmitter(), {
    getPath: jest.fn(() => '/Users/me/Downloads'),
    getAppPath: jest.fn(() => '/repo/electron'),
    // As Windows keeps it: a Run key's command line, which reads back as on
    // only when asked with the same arguments.
    loginItem: { openAtLogin: false, args: [] as string[] },
    getLoginItemSettings: jest.fn(function (
      this: { loginItem: { openAtLogin: boolean; args: string[] } },
      options?: { args?: string[] },
    ) {
      const { openAtLogin, args } = this.loginItem;
      return {
        openAtLogin:
          openAtLogin &&
          JSON.stringify(args) === JSON.stringify(options?.args ?? []),
      };
    }),
    setLoginItemSettings: jest.fn(function (
      this: { loginItem: { openAtLogin: boolean; args: string[] } },
      settings: { openAtLogin: boolean; args?: string[] },
    ) {
      this.loginItem = {
        openAtLogin: settings.openAtLogin,
        args: settings.args ?? [],
      };
    }),
    setUserTasks: jest.fn(),
    quit: jest.fn(),
  });
  const handlers = new Map<string, Handler>();
  const windows: FakeWindow[] = [];
  const trays: {
    menu: MenuItem[];
    listeners: Map<string, () => void>;
    destroy: jest.Mock;
  }[] = [];
  const notifications: { options: object; show: jest.Mock }[] = [];
  class Notification extends EventEmitter {
    static isSupported = jest.fn(() => true);
    show = jest.fn();
    constructor(readonly options: object) {
      super();
      notifications.push(this);
    }
  }
  const image = { resize: jest.fn(() => image) };
  const powerMonitor = new EventEmitter();
  const electron = {
    app,
    BrowserWindow: {
      getAllWindows: () => windows,
      fromWebContents: () => windows[0] ?? null,
    },
    Menu: { buildFromTemplate: (template: MenuItem[]) => template },
    Notification,
    Tray: class {
      menu: MenuItem[] = [];
      listeners = new Map<string, () => void>();
      destroy = jest.fn();
      constructor() {
        trays.push(this);
      }
      setToolTip() {}
      setContextMenu(menu: MenuItem[]) {
        this.menu = menu;
      }
      on(event: string, listener: () => void) {
        this.listeners.set(event, listener);
      }
    },
    dialog: { showOpenDialog: jest.fn(), showSaveDialog: jest.fn() },
    shell: { openPath: jest.fn(), showItemInFolder: jest.fn() },
    clipboard: { writeText: jest.fn() },
    ipcMain: {
      handle: (channel: string, handler: Handler) =>
        handlers.set(channel, handler),
    },
    nativeImage: { createFromPath: () => image },
    net: { fetch: jest.fn() },
    powerMonitor,
  };
  /** Calls an IPC handler as the app's window would, as ipcRenderer.invoke. */
  const invoke = async (channel: string, ...args: unknown[]) => {
    const handler = handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler for ${channel}`);
    }
    return handler({ sender: {} }, ...args);
  };
  /** A window as main.cjs makes one. */
  const createWindow = () => {
    const win = new FakeWindow();
    windows.push(win);
    app.emit('browser-window-created', {}, win);
    return win;
  };
  return {
    electron,
    app,
    invoke,
    handlers,
    createWindow,
    trays,
    notifications,
    powerMonitor,
  };
};

const files = {
  grant: jest.fn((dir: string) => `file://${dir}/`),
  localPath: jest.fn((uri: string) => uri.replace('file://', '')),
  roots: () => ({
    cache: 'file:///data/Caches/',
    document: 'file:///data/Documents/',
  }),
};

const setUp = ({
  platform = 'win32',
  dev = false,
  env = {},
  argv = ['learnX'],
}: {
  platform?: string;
  dev?: boolean;
  env?: Record<string, string>;
  argv?: string[];
} = {}) => {
  const fake = fakeElectron();
  const fromApp = jest.fn();
  const desktop = setUpDesktop({
    electron: fake.electron as never,
    fromApp,
    files,
    cacheDir: '/data/Caches',
    iconFile: '/repo/electron/icons/icon.png',
    dev,
    env,
    platform,
    argv,
  });
  return { ...fake, desktop, fromApp };
};

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  delete (globalThis as { learnxDev?: unknown }).learnxDev;
});

it('reads a launch’s screen and the platforms with login items', () => {
  expect(openTargetOf(['learnX', `${OPEN_ARG}today`])).toBe('today');
  expect(openTargetOf([`${OPEN_ARG}schedule`])).toBe('schedule');
  expect(openTargetOf([`${OPEN_ARG}settings`])).toBeNull();
  expect(openTargetOf(['learnX'])).toBeNull();
  expect(loginItemSupported('win32')).toBe(true);
  expect(loginItemSupported('darwin')).toBe(true);
  expect(loginItemSupported('linux')).toBe(false);
});

it('quits a second launch', () => {
  const app = {
    requestSingleInstanceLock: jest.fn(() => true),
    quit: jest.fn(),
  };
  expect(claimSingleInstance(app)).toBe(true);
  app.requestSingleInstanceLock.mockReturnValue(false);
  expect(claimSingleInstance(app)).toBe(false);
  expect(app.quit).toHaveBeenCalled();
});

describe('the window', () => {
  it('hides on close until the app quits', () => {
    const { app, createWindow } = setUp();
    const win = createWindow();
    const event = { preventDefault: jest.fn() };
    win.emit('close', event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.hide).toHaveBeenCalled();

    app.emit('before-quit');
    const quitting = { preventDefault: jest.fn() };
    win.emit('close', quitting);
    expect(quitting.preventDefault).not.toHaveBeenCalled();
  });

  it.each([
    ['Windows ends the session', 'session-end'],
    ['the system shuts down', 'shutdown'],
  ])('closes for real when %s', (_name, signal) => {
    const { createWindow, powerMonitor } = setUp();
    const win = createWindow();
    if (signal === 'session-end') {
      win.emit('session-end');
    } else {
      powerMonitor.emit('shutdown');
    }
    const event = { preventDefault: jest.fn() };
    win.emit('close', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('quits on close on Linux, where there may be no tray', () => {
    const { createWindow } = setUp({ platform: 'linux' });
    const win = createWindow();
    const event = { preventDefault: jest.fn() };
    win.emit('close', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(win.hide).not.toHaveBeenCalled();
  });

  it('comes back from the Dock once it has been shown', () => {
    const { app, createWindow } = setUp({ platform: 'darwin' });
    const win = createWindow();
    app.emit('activate');
    expect(win.show).not.toHaveBeenCalled();
    win.emit('ready-to-show');
    app.emit('activate');
    expect(win.restore).toHaveBeenCalled();
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
  });

  it('starts hidden when Start at login launched it', () => {
    expect(setUp().desktop.startsHidden()).toBe(false);
    expect(setUp({ argv: ['learnX', HIDDEN_ARG] }).desktop.startsHidden()).toBe(
      true,
    );
  });
});

describe('the tray and the Jump List', () => {
  it('offers Open, Refresh and Quit, in the page’s language once it says', async () => {
    const { trays, invoke, createWindow, app } = setUp();
    const win = createWindow();
    win.visible = false;
    expect(trays).toHaveLength(1);
    const labels = () => trays[0].menu.map(item => item.label ?? item.type);
    expect(labels()).toEqual([
      DEFAULT_LABELS.open,
      DEFAULT_LABELS.refresh,
      'separator',
      DEFAULT_LABELS.quit,
    ]);

    trays[0].menu[0].click!();
    expect(win.show).toHaveBeenCalled();
    trays[0].menu[1].click!();
    expect(win.webContents.send).toHaveBeenCalledWith('background:run', {
      manual: true,
    });
    trays[0].menu[3].click!();
    expect(app.quit).toHaveBeenCalled();

    await invoke('desktop:setLabels', {
      open: '打开learnX',
      refresh: '刷新',
      quit: '',
      today: '今天',
      bogus: 'x',
    });
    expect(labels()).toEqual([
      '打开learnX',
      '刷新',
      'separator',
      'Quit learnX',
    ]);
    expect(trays).toHaveLength(1);
  });

  it('shows the window on a click on Windows only', () => {
    const win = setUp().createWindow();
    const { trays } = setUp({ platform: 'linux' });
    trays[0].listeners.get('click')!();
    expect(win.show).not.toHaveBeenCalled();
  });

  it('sets the Jump List on Windows, with the app’s folder in a dev run', async () => {
    const { app, invoke } = setUp({ dev: true });
    expect(app.setUserTasks).toHaveBeenCalledWith([
      expect.objectContaining({
        program: process.execPath,
        arguments: `"/repo/electron" ${OPEN_ARG}today`,
        title: 'Today',
      }),
      expect.objectContaining({
        arguments: `"/repo/electron" ${OPEN_ARG}schedule`,
        title: 'Schedule',
      }),
    ]);
    await invoke('desktop:setLabels', { schedule: '课表' });
    expect(app.setUserTasks).toHaveBeenLastCalledWith([
      expect.anything(),
      expect.objectContaining({ title: '课表' }),
    ]);

    const packaged = setUp();
    expect(packaged.app.setUserTasks).toHaveBeenCalledWith([
      expect.objectContaining({ arguments: `${OPEN_ARG}today` }),
      expect.anything(),
    ]);
    expect(
      setUp({ platform: 'darwin' }).app.setUserTasks,
    ).not.toHaveBeenCalled();
  });

  it('opens what a launch asked for, once, and what a second launch asks', async () => {
    const { invoke, app, createWindow } = setUp({
      argv: ['learnX', `${OPEN_ARG}schedule`],
    });
    await expect(invoke('desktop:takeOpen')).resolves.toBe('schedule');
    await expect(invoke('desktop:takeOpen')).resolves.toBeNull();

    const win = createWindow();
    win.visible = false;
    app.emit('second-instance', {}, ['learnX', `${OPEN_ARG}today`]);
    expect(win.show).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('desktop:open', 'today');
    app.emit('second-instance', {}, ['learnX']);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
  });

  it('clears up when the app quits', () => {
    const { app, trays } = setUp();
    app.emit('will-quit');
    expect(trays[0].destroy).toHaveBeenCalled();
  });
});

describe('Start at login', () => {
  it('is read but never written until the switch changes', async () => {
    const { app, invoke } = setUp();
    await expect(invoke('loginItem:get')).resolves.toEqual({
      supported: true,
      enabled: false,
    });
    expect(app.setLoginItemSettings).not.toHaveBeenCalled();

    await expect(invoke('loginItem:set', true)).resolves.toBe(true);
    expect(app.setLoginItemSettings).toHaveBeenCalledTimes(1);
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      args: [HIDDEN_ARG],
    });
    await invoke('loginItem:set', false);
    expect(app.setLoginItemSettings).toHaveBeenLastCalledWith({
      openAtLogin: false,
      args: [HIDDEN_ARG],
    });
  });

  it.each(['win32', 'darwin'])(
    'reads back what it wrote on %s',
    async platform => {
      const { invoke } = setUp({ platform });
      await invoke('loginItem:set', true);
      await expect(invoke('loginItem:get')).resolves.toEqual({
        supported: true,
        enabled: true,
      });
      await invoke('loginItem:set', false);
      await expect(invoke('loginItem:get')).resolves.toEqual({
        supported: true,
        enabled: false,
      });
    },
  );

  it('is left alone by a dev run unless allowed', async () => {
    const dev = setUp({ platform: 'darwin', dev: true });
    await expect(dev.invoke('loginItem:set', true)).resolves.toBe(false);
    expect(dev.app.setLoginItemSettings).not.toHaveBeenCalled();

    const allowed = setUp({
      platform: 'darwin',
      dev: true,
      env: { LEARNX_ALLOW_LOGIN_ITEM: '1' },
    });
    await expect(allowed.invoke('loginItem:set', true)).resolves.toBe(true);
    expect(allowed.app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
    });
  });

  it('isn’t offered on Linux', async () => {
    const { app, invoke } = setUp({ platform: 'linux' });
    await expect(invoke('loginItem:get')).resolves.toEqual({
      supported: false,
      enabled: false,
    });
    await expect(invoke('loginItem:set', true)).resolves.toBe(false);
    expect(app.getLoginItemSettings).not.toHaveBeenCalled();
    expect(app.setLoginItemSettings).not.toHaveBeenCalled();
  });
});

describe('notifications', () => {
  it('shows system notifications in a packaged app', async () => {
    const { invoke, notifications, createWindow } = setUp();
    const win = createWindow();
    await expect(invoke('notifications:supported')).resolves.toBe(true);
    const request = {
      identifier: 'n',
      content: { title: 'Homework 6', subtitle: 'Probability', body: 'Graded' },
      trigger: null,
    };
    await invoke('notifications:schedule', request);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].options).toEqual({
      title: 'Homework 6',
      body: 'Probability\nGraded',
      icon: expect.anything(),
    });
    expect(notifications[0].show).toHaveBeenCalled();

    (notifications[0] as unknown as EventEmitter).emit('click');
    expect(win.show).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith(
      'notifications:response',
      request,
    );
  });

  it('only logs them in a dev run, for the page to show', async () => {
    const { invoke, notifications, createWindow } = setUp({ dev: true });
    const win = createWindow();
    await expect(invoke('notifications:supported')).resolves.toBe(true);
    await invoke('notifications:schedule', {
      identifier: 'n',
      content: { title: 'T', body: 'B\nC' },
      trigger: null,
    });
    expect(notifications).toHaveLength(0);
    expect(console.log).toHaveBeenCalledWith('[notification] T | B / C');
    expect(win.webContents.send).toHaveBeenCalledWith(
      'notifications:devShown',
      { title: 'T', body: 'B\nC' },
    );
    const dev = (
      globalThis as unknown as {
        learnxDev: {
          notifications: { options: unknown; click: () => void }[];
          tray: () => unknown;
          trayMenu: () => unknown;
        };
      }
    ).learnxDev;
    expect(dev.tray()).toBeTruthy();
    expect(dev.trayMenu()).toBeTruthy();
    expect(dev.notifications[0].options).toEqual({ title: 'T', body: 'B\nC' });
    dev.notifications[0].click();
    expect(win.webContents.send).toHaveBeenCalledWith(
      'notifications:response',
      expect.objectContaining({ identifier: 'n' }),
    );
  });

  it('shows system ones in a dev run when asked', async () => {
    const { invoke, notifications } = setUp({
      dev: true,
      env: { LEARNX_NOTIFICATIONS: 'system' },
    });
    await invoke('notifications:schedule', {
      identifier: 'n',
      content: { title: 'T' },
      trigger: null,
    });
    expect(notifications).toHaveLength(1);
  });

  it('keeps reminders, lists and cancels them, and checks them on waking', async () => {
    jest.useFakeTimers();
    const { invoke, powerMonitor, notifications, createWindow } = setUp();
    const win = createWindow();
    await invoke('notifications:schedule', {
      identifier: 'r',
      content: { title: 'R' },
      trigger: { type: 'timeInterval', seconds: 600 },
    });
    await expect(invoke('notifications:list')).resolves.toEqual([
      expect.objectContaining({ identifier: 'r' }),
    ]);
    jest.setSystemTime(Date.now() + 700_000);
    powerMonitor.emit('resume');
    expect(notifications).toHaveLength(1);
    expect(win.webContents.send).toHaveBeenCalledWith('background:run', {
      manual: false,
    });

    await invoke('notifications:schedule', {
      identifier: 'r2',
      content: { title: 'R2' },
      trigger: { type: 'timeInterval', seconds: 600 },
    });
    await invoke('notifications:cancel', 'r2');
    await expect(invoke('notifications:list')).resolves.toEqual([]);
  });
});

describe('the background sync', () => {
  it('runs on the page’s interval, at least every 5 minutes apart', async () => {
    jest.useFakeTimers();
    const { invoke, createWindow } = setUp();
    const win = createWindow();
    await invoke('background:start', 15);
    jest.advanceTimersByTime(SYNC_INTERVAL_MS);
    expect(win.webContents.send).toHaveBeenCalledWith('background:run', {
      manual: false,
    });
    win.webContents.send.mockClear();
    await invoke('background:start', 1);
    jest.advanceTimersByTime(60_000);
    expect(win.webContents.send).not.toHaveBeenCalled();
    jest.advanceTimersByTime(4 * 60_000);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
    await invoke('background:start', 'nonsense');
    win.webContents.send.mockClear();
    jest.advanceTimersByTime(SYNC_INTERVAL_MS);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
  });

  it('runs nothing without a window', () => {
    const { trays } = setUp();
    expect(() => trays[0].menu[1].click!()).not.toThrow();
    expect(() => trays[0].menu[0].click!()).not.toThrow();
  });
});

describe('files', () => {
  it('passes the window’s requests to the file shell', async () => {
    const { invoke, electron, fromApp, createWindow } = setUp();
    createWindow();
    electron.shell.openPath.mockResolvedValue('');
    electron.dialog.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    electron.dialog.showSaveDialog.mockResolvedValue({ canceled: true });
    await expect(invoke('shell:pickDirectory')).resolves.toBeNull();
    await expect(invoke('shell:pickFiles', {})).resolves.toBeNull();
    await expect(invoke('shell:saveText', 'a.ics', 'x')).resolves.toBeNull();
    await invoke('shell:copyText', 'https://learn.tsinghua.edu.cn/f');
    expect(electron.clipboard.writeText).toHaveBeenCalledWith(
      'https://learn.tsinghua.edu.cn/f',
    );
    // Each checks that it comes from the app's window.
    expect(fromApp).toHaveBeenCalledTimes(4);
    await expect(invoke('shell:open', 'https://x')).rejects.toThrow('ENOENT');
    await expect(invoke('shell:showInFolder', 'https://x')).rejects.toThrow(
      'ENOENT',
    );
    await expect(invoke('shell:saveAs', 'https://x', 'n')).rejects.toThrow(
      'ENOENT',
    );
  });

  it('serves previews through Electron’s fetch', async () => {
    const { desktop } = setUp();
    const response = await desktop.servePreview(
      new Request('app://files/cache/a.txt'),
    );
    expect(response.status).toBe(404);
  });
});
