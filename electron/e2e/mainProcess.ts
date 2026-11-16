// Stand-ins in the app's main process for what Playwright can't click: native
// dialogs, notifications, opening files and links, and native menus. Each
// helper patches Electron's modules in the running app (electronApp.evaluate)
// and records what the app asked for, for the test to read back.
import type { ElectronApplication } from '@playwright/test';

/** What the stand-ins recorded, in the main process. */
export interface MainRecord {
  notifications: { title: string; body: string }[];
  openedPaths: string[];
  openedUrls: string[];
  shownInFolder: string[];
  dialogs: { type: string; options: unknown }[];
  menus: { labels: string[] }[];
}

/** Results a test gives the native dialogs. */
export interface DialogAnswers {
  /** `dialog.showOpenDialog`: the files chosen, or none to cancel. */
  open?: string[];
  /** `dialog.showSaveDialog`: where to save, or none to cancel. */
  save?: string;
  /** `dialog.showMessageBox`: the index of the button pressed. */
  messageBox?: number;
}

export const mainProcess = (app: ElectronApplication) => ({
  /**
   * Installs every stand-in. Dialogs answer with `answers` (cancelled by
   * default); notifications, opened paths and links and menus are recorded
   * instead of reaching the system.
   */
  stub: (answers: DialogAnswers = {}) =>
    app.evaluate(({ dialog, Menu, Notification, shell }, given) => {
      const state = globalThis as unknown as {
        learnxE2E?: MainRecord & {
          lastMenu?: Electron.Menu;
          lastClose?: () => void;
        };
      };
      const record = (state.learnxE2E ??= {
        notifications: [],
        openedPaths: [],
        openedUrls: [],
        shownInFolder: [],
        dialogs: [],
        menus: [],
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
      Notification.prototype.show = function show(this: Electron.Notification) {
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
      Menu.prototype.popup = function popup(
        this: Electron.Menu,
        options?: Electron.PopupOptions,
      ) {
        record.menus.push({ labels: this.items.map(item => item.label) });
        state.learnxE2E!.lastMenu = this;
        state.learnxE2E!.lastClose = options?.callback;
      };
    }, answers),

  /** What the stand-ins have recorded so far. */
  record: () =>
    app.evaluate(() => {
      const {
        lastMenu: _,
        lastClose: __,
        ...record
      } = (
        globalThis as unknown as {
          learnxE2E: MainRecord & Record<string, unknown>;
        }
      ).learnxE2E;
      return record as MainRecord;
    }),

  /**
   * Chooses the item whose label starts with `label` in the native menu the
   * app showed last (a card's context menu), as a click would, then closes it.
   */
  chooseMenuItem: (label: string) =>
    app.evaluate((_electron, wanted) => {
      const state = (
        globalThis as unknown as {
          learnxE2E?: { lastMenu?: Electron.Menu; lastClose?: () => void };
        }
      ).learnxE2E;
      const item = state?.lastMenu?.items.find(
        candidate => candidate.label.split('\t')[0] === wanted,
      );
      if (!item) {
        throw new Error(`No menu item ${wanted}`);
      }
      item.click();
      state?.lastClose?.();
    }, label),
});

export type MainProcess = ReturnType<typeof mainProcess>;
