import { requireOptionalNativeModule } from 'expo';
import type { NativeModule } from 'expo';

type MenuBarEvents = {
  /** Check for New Content was chosen in the menu bar item's menu. */
  onCheckForNewContent: () => void;
};

/** The labels of the menu bar item's menu, in the app's language. */
export interface MenuBarLabels {
  open: string;
  checkForNewContent: string;
  quit: string;
}

/**
 * Whether learnX opens at login: `on`; `off`; `requiresApproval`, turned
 * off in System Settings › General › Login Items, where only the user can
 * turn it back on.
 */
export type OpenAtLoginState = 'on' | 'off' | 'requiresApproval';

declare class MenuBarModule extends NativeModule<MenuBarEvents> {
  /** Shows learnX's item in the menu bar, which stays while learnX runs. */
  showItem(labels: MenuBarLabels): Promise<void>;
  getOpenAtLogin(): Promise<OpenAtLoginState>;
  /**
   * Adds learnX to the login items or removes it, and resolves to the state
   * after. Turning it on while it needs approval opens System Settings.
   */
  setOpenAtLogin(on: boolean): Promise<OpenAtLoginState>;
}

/**
 * Null where the native module isn't in the binary (Jest, or JS from Metro
 * running in an app built before it was added). Only the Mac has a menu bar:
 * on iPhone and iPad its functions do nothing and say `off`.
 */
export const MenuBar = requireOptionalNativeModule<MenuBarModule>('MenuBar');
