// learnX on the desktop around its window: the tray icon, closing to the tray,
// the background sync's timer, notifications (notifications.cjs), files
// opened, saved and picked (fileShell.cjs), Start at login and the Windows
// Jump List. main.cjs sets it up; the page reaches it through preload.cjs.
//
// Nothing is registered with the system unless the user asks: Start at login
// is written only when its switch in Settings changes, and never from a dev
// run unless LEARNX_ALLOW_LOGIN_ITEM=1.
const { clearPicked, createFileShell } = require('./fileShell.cjs');
const { createNotifier } = require('./notifications.cjs');

/** How often the background sync runs while learnX is open, as on the phone. */
const SYNC_INTERVAL_MS = 15 * 60 * 1000;

/** The argument a Jump List task (or a second launch) opens a screen with. */
const OPEN_ARG = '--learnx-open=';

/** What a Jump List task may open. */
const OPEN_TARGETS = new Set(['today', 'schedule']);

/** The argument Start at login launches with on Windows: start in the tray. */
const HIDDEN_ARG = '--hidden';

/**
 * The screen a launch's arguments ask for, if any.
 * @param {readonly string[]} argv
 */
const openTargetOf = argv => {
  const arg = argv.find(a => a.startsWith(OPEN_ARG));
  const target = arg?.slice(OPEN_ARG.length);
  return target && OPEN_TARGETS.has(target) ? target : null;
};

/**
 * The tray's and the Jump List's labels, in English until the page sends
 * them in the app's language.
 */
const DEFAULT_LABELS = {
  open: 'Open learnX',
  refresh: 'Refresh',
  quit: 'Quit learnX',
  today: 'Today',
  schedule: 'Schedule',
};

/**
 * Whether Start at login is offered: Electron sets it on Windows and macOS,
 * not on Linux.
 * @param {string} platform
 */
const loginItemSupported = platform =>
  platform === 'win32' || platform === 'darwin';

/**
 * The login item's options, the same for reading and writing it: on Windows
 * it's the Run key's command line, which only reads back as on when the
 * arguments match.
 * @param {string} platform
 */
const loginItemOptions = platform =>
  platform === 'win32' ? { args: [HIDDEN_ARG] } : {};

/**
 * Whether closing the window keeps learnX running (in the tray on Windows,
 * the Dock on macOS); on Linux it quits.
 * @param {string} platform
 */
const closesToTray = platform => platform !== 'linux';

/**
 * Claims the single instance before the app is ready: a second launch (a
 * Jump List task, or opening learnX again) quits and hands its arguments to
 * this one. Returns false in the second launch.
 * @param {Pick<Electron.App, 'requestSingleInstanceLock' | 'quit'>} app
 */
const claimSingleInstance = app => {
  if (app.requestSingleInstanceLock()) {
    return true;
  }
  app.quit();
  return false;
};

/**
 * @typedef {object} DesktopDeps
 * @property {typeof import('electron')} electron
 * @property {(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => void} fromApp
 *   throws for IPC from anywhere but the app's window
 * @property {import('./fileShell.cjs').FileShellDeps['files']} files
 * @property {string} cacheDir
 * @property {string} iconFile
 * @property {boolean} dev
 * @property {Record<string, string | undefined>} [env]
 * @property {string} [platform]
 * @property {readonly string[]} [argv] this launch's arguments
 */

/** @param {DesktopDeps} deps */
const setUpDesktop = ({
  electron,
  fromApp,
  files,
  cacheDir,
  iconFile,
  dev,
  env = process.env,
  platform = process.platform,
  argv = process.argv,
}) => {
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
  const send = (
    /** @type {string} */ channel,
    /** @type {unknown[]} */ ...args
  ) => {
    const win = appWindow();
    if (win && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  };

  const showWindow = () => {
    const win = appWindow();
    if (!win) {
      return;
    }
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
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
   * @param {Electron.BrowserWindow} win
   */
  const keepOnClose = win => {
    if (!closesToTray(platform)) {
      return;
    }
    win.on('close', event => {
      if (!quitting) {
        event.preventDefault();
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
  const windowOf = (/** @type {Electron.IpcMainInvokeEvent} */ event) =>
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
    return fileShell.pickDirectory(windowOf(event));
  });
  ipcMain.handle('shell:pickFiles', (event, options) => {
    fromApp(event);
    return fileShell.pickFiles(windowOf(event), options);
  });
  ipcMain.handle('shell:copyText', (event, text) => {
    fromApp(event);
    electron.clipboard.writeText(String(text));
  });

  // Notifications. A dev run never shows system ones (on a Mac, a learnX
  // entry would stay in System Settings › Notifications): it logs them and
  // the page shows them as toasts, unless LEARNX_NOTIFICATIONS=system.
  const systemNotifications = !dev || env.LEARNX_NOTIFICATIONS === 'system';
  const icon = nativeImage.createFromPath(iconFile);
  /** @type {import('./notifications.cjs').NotifierDeps['createNotification']} */
  const createNotification = systemNotifications
    ? options =>
        // Electron's overloads of `on` don't fit a plain listener's type.
        /** @type {any} */ (new Notification({ ...options, icon }))
    : options => {
        /** @type {Map<string, () => void>} */
        const listeners = new Map();
        const notification = {
          show: () => {
            console.log(
              `[notification] ${[options.title, options.subtitle, options.body]
                .filter(Boolean)
                .join(' | ')
                .replaceAll('\n', ' / ')}`,
            );
            send('notifications:devShown', options);
          },
          on: (
            /** @type {string} */ event,
            /** @type {() => void} */ listener,
          ) => {
            listeners.set(event, listener);
          },
          /** For a dev run's inspector and E2E tests: what was shown. */
          options,
          /** For a dev run's inspector: what a click on it would do. */
          click: () => listeners.get('click')?.(),
        };
        devShown.push(notification);
        return notification;
      };
  /** A dev run's logged notifications, newest last (`--inspect` can click one). */
  const devShown = /** @type {{ options: object; click: () => void }[]} */ ([]);
  if (dev) {
    // For a dev run's inspector (`--inspect`) and the E2E tests (which drive
    // the main process the same way): its logged notifications, to click
    // one, the tray and the tray's menu, whose items have no other way in.
    Object.assign(globalThis, {
      learnxDev: {
        notifications: devShown,
        tray: () => tray,
        trayMenu: () => trayMenu,
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
  const runSync = (/** @type {boolean} */ manual) =>
    send('background:run', { manual });
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let syncTimer;
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
  let labels = DEFAULT_LABELS;
  /** @type {Electron.Tray | null} */
  let tray = null;
  /** @type {Electron.Menu | null} */
  let trayMenu = null;
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
      { label: labels.refresh, click: () => runSync(true) },
      { type: 'separator' },
      { label: labels.quit, click: () => app.quit() },
    ]);
    tray.setContextMenu(trayMenu);
    if (platform === 'win32') {
      // A dev run starts Electron with the app's folder first.
      const appArgs = dev ? `"${app.getAppPath()}" ` : '';
      app.setUserTasks(
        /** @type {const} */ (['today', 'schedule']).map(target => ({
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
  ipcMain.handle('desktop:setLabels', (event, next) => {
    fromApp(event);
    labels = { ...DEFAULT_LABELS };
    for (const key of /** @type {(keyof typeof DEFAULT_LABELS)[]} */ (
      Object.keys(DEFAULT_LABELS)
    )) {
      if (typeof next?.[key] === 'string' && next[key]) {
        labels[key] = next[key];
      }
    }
    updateMenus();
  });

  // A screen to open from a launch's arguments: this one's, kept until the
  // page asks, or a second launch's, sent right away.
  let pendingOpen = openTargetOf(argv);
  ipcMain.handle('desktop:takeOpen', event => {
    fromApp(event);
    const target = pendingOpen;
    pendingOpen = null;
    return target;
  });
  app.on('second-instance', (_event, secondArgv) => {
    showWindow();
    const target = openTargetOf(secondArgv);
    if (target) {
      send('desktop:open', target);
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
    /** Whether the window starts hidden: Start at login on Windows. */
    startsHidden: () => argv.includes(HIDDEN_ARG),
    /** A dev run's logged notifications, for its inspector. */
    devShown,
    /**
     * Serves a download to the file preview (`app://files/…`).
     * @param {Request} request
     */
    servePreview: request =>
      fileShell.servePreview(request, url => net.fetch(url)),
  };
};

module.exports = {
  setUpDesktop,
  claimSingleInstance,
  closesToTray,
  openTargetOf,
  loginItemSupported,
  loginItemOptions,
  DEFAULT_LABELS,
  HIDDEN_ARG,
  OPEN_ARG,
  SYNC_INTERVAL_MS,
};
