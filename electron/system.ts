// learnX around its window on Windows and Linux: the tray icon, closing to
// the tray, the background sync's timer, notifications (notifications.ts),
// files opened, saved and picked (fileShell.ts), Start at login and the
// Windows Jump List. main.ts sets it up; the page reaches it through
// preload.cts.
//
// Nothing is registered with the system unless the user asks: Start at login
// is written only when its switch in Settings changes, and never from a dev
// run unless LEARNX_ALLOW_LOGIN_ITEM=1.
import { clearPicked, createFileShell } from './fileShell.ts';
import type { FileShellDeps } from './fileShell.ts';
import { createNotifier } from './notifications.ts';
import type { NotifierDeps, ShownNotification } from './notifications.ts';

/** How often the background sync runs while learnX is open, as on the phone. */
export const SYNC_INTERVAL_MS = 15 * 60 * 1000;

/** The argument a Jump List task (or a second launch) opens a screen with. */
export const OPEN_ARG = '--learnx-open=';

/** What a Jump List task may open. */
const OPEN_TARGETS = new Set(['today', 'schedule']);

/** The argument Start at login launches with on Windows: start in the tray. */
export const HIDDEN_ARG = '--hidden';

/** The screen a launch's arguments ask for, if any. */
export const openTargetOf = (argv: readonly string[]): string | null => {
  const arg = argv.find(a => a.startsWith(OPEN_ARG));
  const target = arg?.slice(OPEN_ARG.length);
  return target && OPEN_TARGETS.has(target) ? target : null;
};

/**
 * The tray's, the Jump List's and the export folder picker's labels, in
 * English until the page sends them in the app's language.
 */
export const DEFAULT_LABELS = {
  open: 'Open learnX',
  checkForNewItems: 'Check for new content',
  quit: 'Quit learnX',
  today: 'Today',
  schedule: 'Schedule',
  exportFolder: 'Choose export folder',
};

/**
 * Whether Start at login is offered: Electron sets it on Windows and macOS,
 * not on Linux.
 */
export const loginItemSupported = (platform: string): boolean =>
  platform === 'win32' || platform === 'darwin';

/**
 * The login item's options, the same for reading and writing it: on Windows
 * it's the Run key's command line, which only reads back as on when the
 * arguments match.
 */
export const loginItemOptions = (platform: string): { args?: string[] } =>
  platform === 'win32' ? { args: [HIDDEN_ARG] } : {};

/**
 * Whether closing the window keeps learnX running (in the tray on Windows,
 * the Dock on macOS); on Linux it quits.
 */
export const closesToTray = (platform: string): boolean => platform !== 'linux';

/**
 * Claims the single instance before the app is ready: a second launch (a
 * Jump List task, or opening learnX again) quits and hands its arguments to
 * this one. Returns false in the second launch.
 */
export const claimSingleInstance = (
  app: Pick<Electron.App, 'requestSingleInstanceLock' | 'quit'>,
): boolean => {
  if (app.requestSingleInstanceLock()) {
    return true;
  }
  app.quit();
  return false;
};

type Labels = typeof DEFAULT_LABELS;

/** A dev run's stand-in for a notification, which only logs it. */
type DevNotification = ShownNotification & {
  /** For a dev run's inspector and E2E tests: what was shown. */
  options: object;
  /** For a dev run's inspector: what a click on it would do. */
  click: () => void;
};

export type SystemDeps = {
  electron: typeof import('electron');
  /** Throws for IPC from anywhere but the app's window. */
  fromApp: (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => void;
  files: FileShellDeps['files'];
  cacheDir: string;
  iconFile: string;
  dev: boolean;
  /**
   * An E2E run: never focus a window or bring it to the front (it only
   * records that it would have), so the tests never take the foreground.
   */
  background?: boolean;
  env?: Record<string, string | undefined>;
  platform?: string;
  /** This launch's arguments. */
  argv?: readonly string[];
};

export const setUpSystem = ({
  electron,
  fromApp,
  files,
  cacheDir,
  iconFile,
  dev,
  background = false,
  env = process.env,
  platform = process.platform,
  argv = process.argv,
}: SystemDeps) => {
  const {
    app,
    BrowserWindow,
    Menu,
    Notification,
    Tray,
    dialog,
    ipcMain,
    nativeImage,
    net,
    powerMonitor,
    shell,
  } = electron;

  /** The app's window: there's only ever one. */
  const appWindow = () =>
    BrowserWindow.getAllWindows().find(win => !win.isDestroyed()) ?? null;

  /** Sends to the page, if the window is there. */
  const send = (channel: string, ...args: unknown[]) => {
    const win = appWindow();
    if (win && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  };

  /**
   * Whether the app means its window to show: what it last asked for, which
   * an E2E run reads (`learnxDev.windowShown`), since its window shows only
   * behind the others, or not at all on a Mac.
   */
  let windowShown = false;

  /**
   * Shows the window (maximized when asked), and with `focus` brings it to
   * the front. In an E2E run (`background`) it only records that it would
   * (on Windows and Linux it shows the window behind the others).
   */
  const present = (
    win: Electron.BrowserWindow,
    {
      maximize = false,
      focus = true,
    }: { maximize?: boolean; focus?: boolean } = {},
  ): void => {
    windowShown = true;
    if (background) {
      // A window that was never shown hardly draws: under Wayland it gets no
      // frames, so its page never draws, and on Windows about two a second,
      // so animations and Playwright's waits for a still element crawl
      // (each test took several times as long). Windows and Linux show it
      // without taking the focus; a Mac app draws its hidden window.
      if (platform !== 'darwin' && !win.isVisible()) {
        win.showInactive();
      }
      return;
    }
    if (win.isMinimized()) {
      win.restore();
    }
    if (maximize) {
      win.maximize();
    } else {
      win.show();
    }
    if (focus) {
      win.focus();
    }
  };

  const showWindow = () => {
    const win = appWindow();
    if (win) {
      present(win);
    }
  };

  let quitting = false;
  const markQuitting = () => {
    quitting = true;
  };
  app.on('before-quit', markQuitting);
  // Signing out or shutting down ends learnX too, without waiting on a close
  // it would otherwise turn into hiding (and with an update to install on
  // quit): Windows tells the window, Linux and macOS the power monitor.
  powerMonitor.on('shutdown', markQuitting);

  /**
   * Closing the window hides it: learnX stays in the tray on Windows (and in
   * the Dock on macOS, where Quit ends it, as Mac apps do), so the sync and
   * the reminders keep going. On Linux it quits: GNOME shows no tray icons
   * without an extension, and nothing tells whether one would show, so a
   * hidden window could have no way back.
   */
  const keepOnClose = (win: Electron.BrowserWindow) => {
    if (!closesToTray(platform)) {
      return;
    }
    win.on('close', event => {
      if (!quitting) {
        event.preventDefault();
        windowShown = false;
        win.hide();
      }
    });
  };
  /** Whether the window has been ready to show, so the Dock may show it. */
  let windowReady = false;
  app.on('browser-window-created', (_event, win) => {
    win.on('session-end', markQuitting);
    keepOnClose(win);
    win.once('ready-to-show', () => {
      windowReady = true;
    });
  });
  // Clicking learnX in the Dock (macOS) brings the window back.
  app.on('activate', () => {
    if (windowReady) {
      showWindow();
    }
  });

  // Files.
  clearPicked(cacheDir);
  const fileShell = createFileShell({
    dialog,
    shell,
    files,
    cacheDir,
    defaultDir: () => app.getPath('downloads'),
  });
  const windowOf = (event: Electron.IpcMainInvokeEvent) =>
    BrowserWindow.fromWebContents(event.sender);
  ipcMain.handle('shell:open', (event, uri, labels) => {
    fromApp(event);
    return fileShell.open(windowOf(event), uri, labels);
  });
  ipcMain.handle('shell:showInFolder', (event, uri) => {
    fromApp(event);
    fileShell.showInFolder(uri);
  });
  ipcMain.handle('shell:saveAs', (event, uri, name) => {
    fromApp(event);
    return fileShell.saveAs(windowOf(event), uri, name);
  });
  ipcMain.handle('shell:saveText', (event, name, content) => {
    fromApp(event);
    return fileShell.saveText(windowOf(event), name, content);
  });
  ipcMain.handle('shell:pickDirectory', event => {
    fromApp(event);
    return fileShell.pickDirectory(windowOf(event), labels.exportFolder);
  });
  ipcMain.handle('shell:pickFiles', (event, options) => {
    fromApp(event);
    return fileShell.pickFiles(windowOf(event), options);
  });

  // Notifications. A dev run never shows system ones (on a Mac, a learnX
  // entry would stay in System Settings › Notifications): it logs them and
  // the page shows them as toasts, unless LEARNX_NOTIFICATIONS=system.
  const systemNotifications = !dev || env.LEARNX_NOTIFICATIONS === 'system';
  const icon = nativeImage.createFromPath(iconFile);
  const createNotification: NotifierDeps['createNotification'] =
    systemNotifications
      ? options =>
          // Electron's overloads of `on` don't fit a plain listener's type.
          new Notification({ ...options, icon }) as ShownNotification
      : options => {
          const listeners = new Map<string, () => void>();
          const notification: DevNotification = {
            show: () => {
              console.log(
                `[notification] ${[
                  options.title,
                  options.subtitle,
                  options.body,
                ]
                  .filter(Boolean)
                  .join(' | ')
                  .replaceAll('\n', ' / ')}`,
              );
              send('notifications:devShown', options);
            },
            on: (event, listener) => {
              listeners.set(event, listener);
            },
            options,
            click: () => listeners.get('click')?.(),
          };
          devShown.push(notification);
          return notification;
        };
  /** A dev run's logged notifications, newest last (`--inspect` can click one). */
  const devShown: DevNotification[] = [];
  if (dev) {
    // For a dev run's inspector (`--inspect`) and the E2E tests (which drive
    // the main process the same way): its logged notifications, to click
    // one, the tray and the tray's menu, whose items have no other way in.
    Object.assign(globalThis, {
      learnxDev: {
        notifications: devShown,
        tray: () => tray,
        trayMenu: () => trayMenu,
        windowShown: () => windowShown,
        hideWindow: () => {
          windowShown = false;
          appWindow()?.hide();
        },
      },
    });
  }
  const notifier = createNotifier({
    createNotification,
    platform,
    onClick: request => {
      showWindow();
      send('notifications:response', request);
    },
  });
  ipcMain.handle('notifications:supported', event => {
    fromApp(event);
    return systemNotifications ? Notification.isSupported() : true;
  });
  ipcMain.handle('notifications:schedule', (event, request) => {
    fromApp(event);
    return notifier.schedule(request);
  });
  ipcMain.handle('notifications:cancel', (event, identifier) => {
    fromApp(event);
    notifier.cancel(identifier);
  });
  ipcMain.handle('notifications:list', event => {
    fromApp(event);
    return notifier.list();
  });

  // The background sync: the page runs it (services/background), when this
  // timer says, since a hidden window's own timers are slowed down.
  const runSync = (manual: boolean) => send('background:run', { manual });
  let syncTimer: ReturnType<typeof setInterval> | undefined;
  ipcMain.handle('background:start', (event, minutes) => {
    fromApp(event);
    clearInterval(syncTimer);
    const interval =
      Math.max(Number(minutes) || SYNC_INTERVAL_MS / 60_000, 5) * 60 * 1000;
    syncTimer = setInterval(() => runSync(false), interval);
  });
  powerMonitor.on('resume', () => {
    notifier.check();
    runSync(false);
  });

  // Start at login.
  ipcMain.handle('loginItem:get', event => {
    fromApp(event);
    return {
      supported: loginItemSupported(platform),
      enabled:
        loginItemSupported(platform) &&
        app.getLoginItemSettings(loginItemOptions(platform)).openAtLogin,
    };
  });
  ipcMain.handle('loginItem:set', (event, enabled) => {
    fromApp(event);
    if (!loginItemSupported(platform)) {
      return false;
    }
    if (dev && env.LEARNX_ALLOW_LOGIN_ITEM !== '1') {
      console.log(
        `[login item] not changed in a dev run (would be ${Boolean(enabled)})`,
      );
      return false;
    }
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      ...loginItemOptions(platform),
    });
    return true;
  });

  // The tray icon and the Jump List, in the page's language once it says.
  let labels: Labels = DEFAULT_LABELS;
  let tray: Electron.Tray | null = null;
  let trayMenu: Electron.Menu | null = null;
  /**
   * Linux: GNOME's tray extension starts a launch (a busy cursor) for every
   * click on a tray menu item and hands learnX its activation token, which
   * only a window coming forward ends. Without one, as for Quit, the cursor
   * stays busy until GNOME gives up on the launch, after learnX is gone.
   */
  const endTrayLaunch = () => {
    if (platform === 'linux' && !background) {
      appWindow()?.focus();
    }
  };
  const updateMenus = () => {
    if (!tray) {
      const image = nativeImage.createFromPath(iconFile);
      tray = new Tray(
        platform === 'darwin' ? image.resize({ width: 18, height: 18 }) : image,
      );
      tray.setToolTip('learnX');
      // A click shows learnX on Windows; macOS and Linux show the menu.
      tray.on('click', () => {
        if (platform === 'win32') {
          showWindow();
        }
      });
    }
    trayMenu = Menu.buildFromTemplate([
      { label: labels.open, click: showWindow },
      {
        label: labels.checkForNewItems,
        click: () => {
          endTrayLaunch();
          runSync(true);
        },
      },
      { type: 'separator' },
      {
        label: labels.quit,
        click: () => {
          endTrayLaunch();
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(trayMenu);
    if (platform === 'win32') {
      // A dev run starts Electron with the app's folder first.
      const appArgs = dev ? `"${app.getAppPath()}" ` : '';
      app.setUserTasks(
        (['today', 'schedule'] as const).map(target => ({
          program: process.execPath,
          arguments: `${appArgs}${OPEN_ARG}${target}`,
          title: labels[target],
          description: labels[target],
          iconPath: process.execPath,
          iconIndex: 0,
        })),
      );
    }
  };
  ipcMain.handle('system:setLabels', (event, next) => {
    fromApp(event);
    labels = { ...DEFAULT_LABELS };
    for (const key of Object.keys(DEFAULT_LABELS) as (keyof Labels)[]) {
      const value: unknown = next?.[key];
      if (typeof value === 'string' && value) {
        labels[key] = value;
      }
    }
    updateMenus();
  });

  // A screen to open from a launch's arguments: this one's, kept until the
  // page asks, or a second launch's, sent right away.
  let pendingOpen = openTargetOf(argv);
  ipcMain.handle('system:takeOpen', event => {
    fromApp(event);
    const target = pendingOpen;
    pendingOpen = null;
    return target;
  });
  app.on('second-instance', (_event, secondArgv) => {
    showWindow();
    const target = openTargetOf(secondArgv);
    if (target) {
      send('system:open', target);
    }
  });

  app.on('will-quit', () => {
    clearInterval(syncTimer);
    notifier.clear();
    tray?.destroy();
    tray = null;
  });

  updateMenus();

  return {
    /**
     * Whether the window starts hidden: Start at login on Windows, the only
     * platform whose login item passes the argument (a launch from anywhere
     * else always shows the window).
     */
    startsHidden: () => platform === 'win32' && argv.includes(HIDDEN_ARG),
    present,
    /** Serves a download to the file preview (`app://files/…`). */
    servePreview: (request: Request): Promise<Response> =>
      fileShell.servePreview(request, url => net.fetch(url)),
  };
};

export type System = ReturnType<typeof setUpSystem>;
