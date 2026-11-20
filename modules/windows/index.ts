import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { NativeModule } from 'expo';

type WindowsEvents = {
  /**
   * The Mac app came to the front (`active`) or another app did. Never sent
   * on iPhone or iPad.
   */
  onActiveChange: (event: { active: boolean }) => void;
};

declare class WindowsModule extends NativeModule<WindowsEvents> {
  /** iPad and Mac; not iPhone. */
  supportsMultipleWindows(): boolean;
  /**
   * The window that links, menu commands, notification taps and toasts are
   * for: the one the person last touched, clicked or brought to the front, or
   * the one a link was just delivered to. Null until UIKit names one.
   */
  targetWindowId(): string | null;
  /**
   * The learnx:// link of what a window shows, which reopens it when the
   * window comes back after a relaunch.
   */
  setWindowLink(windowId: string, link: string | null): void;
  /**
   * Names a window after what it shows, in the Mac's Dock and Window menus
   * and in App Exposé on iPad.
   */
  setWindowTitle(windowId: string, title: string): Promise<void>;
  /** Opens a new window on a learnx:// link. */
  openWindow(link: string): Promise<void>;
}

/**
 * Null where the native module isn't in the binary (Android, the Electron
 * app, Jest, or JS from Metro running in an app built before it was added).
 */
export const Windows =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<WindowsModule>('LearnXWindows')
    : null;
