// Stand-ins in the app's main process for what Playwright can't click: native
// dialogs, notifications, opening files and links, native menus, the tray,
// the clipboard and Start at login. Each helper patches Electron's modules in
// the running app (electronApp.evaluate) and records what the app asked for,
// for the test to read back. The fixtures install them before a test starts,
// so nothing reaches the system.
import type { ElectronApplication } from '@playwright/test';

/** What the stand-ins recorded, in the main process. */
export interface MainRecord {
  notifications: { title: string; body: string }[];
  openedPaths: string[];
  openedUrls: string[];
  shownInFolder: string[];
  dialogs: { type: string; options: unknown }[];
  menus: { labels: string[] }[];
  clipboard: string[];
  loginItems: unknown[];
  installs: number;
}

/** Results a test gives the native dialogs. */
export interface DialogAnswers {
  /** `dialog.showOpenDialog`: the files or folder chosen, or none to cancel. */
  open?: string[];
  /** `dialog.showSaveDialog`: where to save, or none to cancel. */
  save?: string;
  /** `dialog.showMessageBox`: the index of the button pressed. */
  messageBox?: number;
}

/** A notification the app showed: on a dev run, logged instead (system.cjs). */
export interface ShownNotification {
  title?: string;
  subtitle?: string;
  body?: string;
}

interface State {
  learnxE2E?: MainRecord & {
    lastMenu?: Electron.Menu;
    lastClose?: () => void;
  };
  learnxUpdaterLog?: string[];
  learnxDev?: {
    notifications: { options: ShownNotification; click: () => void }[];
    tray: () => Electron.Tray | null;
    trayMenu: () => Electron.Menu | null;
  };
}

/** A label as a regular expression's parts, for the main process. */
const exactly = (label: string) => ({
  source: `^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
  flags: '',
});

export const mainProcess = (app: ElectronApplication) => ({
  /**
   * Installs every stand-in. Dialogs answer with `answers` (cancelled by
   * default); notifications, opened paths and links, menus, the clipboard
   * and Start at login are recorded instead of reaching the system. Call it
   * again to change the answers.
   */
  stub: (answers: DialogAnswers = {}) =>
    app.evaluate(
      (
        { app: electronApp, clipboard, dialog, Menu, Notification, shell },
        given,
      ) => {
        const state = globalThis as unknown as State;
        const record = (state.learnxE2E ??= {
          notifications: [],
          openedPaths: [],
          openedUrls: [],
          shownInFolder: [],
          dialogs: [],
          menus: [],
          clipboard: [],
          loginItems: [],
          installs: 0,
        });
        dialog.showOpenDialog = (async (...args: unknown[]) => {
          record.dialogs.push({ type: 'open', options: args.at(-1) });
          return {
            canceled: !given.open?.length,
            filePaths: given.open ?? [],
          };
        }) as typeof dialog.showOpenDialog;
        dialog.showSaveDialog = (async (...args: unknown[]) => {
          record.dialogs.push({ type: 'save', options: args.at(-1) });
          return { canceled: !given.save, filePath: given.save ?? '' };
        }) as typeof dialog.showSaveDialog;
        dialog.showMessageBox = (async (...args: unknown[]) => {
          record.dialogs.push({ type: 'messageBox', options: args.at(-1) });
          return { response: given.messageBox ?? 0, checkboxChecked: false };
        }) as typeof dialog.showMessageBox;
        Notification.prototype.show = function show(
          this: Electron.Notification,
        ) {
          record.notifications.push({ title: this.title, body: this.body });
        };
        shell.openPath = async (target: string) => {
          record.openedPaths.push(target);
          return '';
        };
        shell.openExternal = async (url: string) => {
          record.openedUrls.push(url);
        };
        shell.showItemInFolder = (target: string) => {
          record.shownInFolder.push(target);
        };
        clipboard.writeText = async (written: string) => {
          record.clipboard.push(written);
        };
        // Start at login as Windows keeps it, in the data folder so a
        // relaunch reads it back: on only when read with the arguments it
        // was written with.
        const fs = process.getBuiltinModule('node:fs');
        const loginItemFile = `${electronApp.getPath('userData')}/e2e-login-item.json`;
        electronApp.setLoginItemSettings = (settings: Electron.Settings) => {
          record.loginItems.push(settings);
          fs.writeFileSync(loginItemFile, JSON.stringify(settings));
        };
        electronApp.getLoginItemSettings = ((
          options?: Electron.LoginItemSettingsOptions,
        ) => {
          const written: Electron.Settings = fs.existsSync(loginItemFile)
            ? JSON.parse(fs.readFileSync(loginItemFile, 'utf8'))
            : { openAtLogin: false };
          return {
            openAtLogin:
              !!written.openAtLogin &&
              JSON.stringify(written.args ?? []) ===
                JSON.stringify(options?.args ?? []),
          };
        }) as typeof electronApp.getLoginItemSettings;
        Menu.prototype.popup = function popup(
          this: Electron.Menu,
          options?: Electron.PopupOptions,
        ) {
          record.menus.push({ labels: this.items.map(item => item.label) });
          record.lastMenu = this;
          record.lastClose = options?.callback;
        };
      },
      answers,
    ),

  /** What the stand-ins have recorded so far. */
  record: () =>
    app.evaluate(() => {
      const {
        lastMenu: _,
        lastClose: __,
        ...record
      } = (globalThis as unknown as Required<State>).learnxE2E;
      return record as MainRecord;
    }),

  /**
   * Chooses the item whose label starts with `label` in the native menu the
   * app showed last (a card's context menu), as a click would, then closes it.
   */
  chooseMenuItem: (label: string | RegExp) =>
    app.evaluate(
      (_electron, { source, flags }) => {
        const state = (globalThis as unknown as State).learnxE2E;
        const wanted = new RegExp(source, flags);
        const item = state?.lastMenu?.items.find(candidate =>
          wanted.test(candidate.label.split('\t')[0]),
        );
        if (!item) {
          throw new Error(`No menu item ${wanted}`);
        }
        item.click();
        state?.lastClose?.();
      },
      typeof label === 'string'
        ? exactly(label)
        : { source: label.source, flags: label.flags },
    ),

  /** The tray menu's labels (separators are empty). Dev runs only. */
  trayLabels: () =>
    app.evaluate(
      () =>
        (globalThis as unknown as Required<State>).learnxDev
          .trayMenu()
          ?.items.map(item => item.label) ?? [],
    ),

  /** Chooses an item of the tray's menu by its label. Dev runs only. */
  chooseTrayItem: (label: string | RegExp) =>
    app.evaluate(
      (_electron, { source, flags }) => {
        const wanted = new RegExp(source, flags);
        const item = (globalThis as unknown as Required<State>).learnxDev
          .trayMenu()
          ?.items.find(candidate => wanted.test(candidate.label));
        if (!item) {
          throw new Error(`No tray item ${wanted}`);
        }
        item.click();
      },
      typeof label === 'string'
        ? exactly(label)
        : { source: label.source, flags: label.flags },
    ),

  /**
   * The notifications the app showed, oldest first: a dev run logs them
   * instead of showing them (system.cjs). Dev runs only.
   */
  shownNotifications: () =>
    app.evaluate(() =>
      (globalThis as unknown as Required<State>).learnxDev.notifications.map(
        ({ options }) => options,
      ),
    ),

  /** What the updater logged (updater.cjs), oldest first. Dev runs only. */
  updaterLog: () =>
    app.evaluate(() => [
      ...((globalThis as unknown as State).learnxUpdaterLog ?? []),
    ]),

  /** Clicks a notification the app showed (the last by default). */
  clickNotification: (index = -1) =>
    app.evaluate((_electron, at) => {
      const shown = (globalThis as unknown as Required<State>).learnxDev
        .notifications;
      const notification = shown.at(at);
      if (!notification) {
        throw new Error(`No notification ${at} of ${shown.length}`);
      }
      notification.click();
    }, index),

  /** Whether the window is showing. */
  windowVisible: () =>
    app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().some(win => win.isVisible()),
    ),

  /** Closes the window with its close button, as the user would. */
  closeWindow: () =>
    app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.close();
    }),

  /** Hides the window, as closing it does where learnX keeps running. */
  hideWindow: () =>
    app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.hide();
    }),

  /**
   * Hands a second launch's arguments to this one, as a Jump List task does
   * (Windows starts a second learnX, which passes them on and quits).
   */
  secondLaunch: (args: string[]) =>
    app.evaluate(({ app: electronApp }, argv) => {
      electronApp.emit('second-instance', {}, [process.execPath, ...argv], '');
    }, args),

  /**
   * Records electron-updater's install (quit and run the installer) instead
   * of quitting, and keeps it from installing when the app quits. For a run
   * with LEARNX_UPDATE_URL, before anything has downloaded.
   */
  stubInstall: () =>
    app.evaluate(({ app: electronApp }) => {
      const state = globalThis as unknown as Required<State>;
      // The copy main.cjs loaded: required from the app's own folder.
      const { createRequire } = process.getBuiltinModule('node:module');
      const { autoUpdater } = createRequire(
        `${electronApp.getAppPath()}/main.cjs`,
      )('electron-updater') as {
        autoUpdater: {
          quitAndInstall: () => void;
          autoInstallOnAppQuit: boolean;
        };
      };
      autoUpdater.quitAndInstall = () => {
        state.learnxE2E.installs += 1;
      };
      // Nor when the test closes the app (updater.cjs turns it on).
      autoUpdater.autoInstallOnAppQuit = false;
    }),
});

export type MainProcess = ReturnType<typeof mainProcess>;
