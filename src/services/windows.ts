import { DeviceEventEmitter } from 'react-native';
import { create } from 'zustand';
import { Windows } from 'modules/windows';
import { isElectron } from 'helpers/platform';

/**
 * The app's windows on iPad and Mac. Each is its own React root on the one
 * JS runtime, so the stores and the query cache are shared, and each root
 * has its own navigation. A root learns its id from its props
 * (`hooks/useWindow`); elsewhere (iPhone before the native module, Android,
 * the Electron app) there's one window, with no id.
 *
 * What a window can do is for one of two windows:
 * - the target, for what the person does or opens: a link, a menu command,
 *   a notification or Spotlight tap, a toast;
 * - the primary, for what the app does once for all its windows: logging in
 *   again, background fetch, taking a shared file.
 */

/** The ids of the windows whose roots are mounted, oldest first. */
const useWindowsStore = create<{ ids: string[] }>(() => ({ ids: [] }));

/** Adds a window as its root mounts. Returns the call that removes it. */
export const registerWindow = (id: string) => {
  useWindowsStore.setState(({ ids }) => ({
    ids: ids.includes(id) ? ids : [...ids, id],
  }));
  return () =>
    useWindowsStore.setState(({ ids }) => ({
      ids: ids.filter(other => other !== id),
    }));
};

/** The window that does the app-wide work: the oldest one still open. */
export const usePrimaryWindow = () => useWindowsStore(state => state.ids[0]);

/**
 * The window that what the person does or opens is for: the one UIKit says
 * (`targetWindowId`) when it's one of the app's roots, else the oldest one.
 */
export const targetWindow = (): string | undefined => {
  const { ids } = useWindowsStore.getState();
  const target = Windows?.targetWindowId();
  return target && ids.includes(target) ? target : ids[0];
};

/** Whether an event is for the window `id`. With no id, it's the only one. */
export const isTargetWindow = (id: string | undefined) =>
  id === undefined || targetWindow() === id;

/** Whether "Open in New Window" can be offered: iPad and Mac. */
export const canOpenWindows = () => Windows?.supportsMultipleWindows() ?? false;

/** Opens a new window on a learnx:// link. */
export const openWindow = (link: string) => {
  void Windows?.openWindow(link).catch(() => {});
};

/** What the window `id` shows, to reopen after a relaunch. */
export const setWindowLink = (id: string, link: string) => {
  Windows?.setWindowLink(id, link);
};

/**
 * Names a window after what it shows: the window `id` on iPad and Mac, or
 * the Electron app's one window through the page's title, which its main
 * process shows as "<title> - learnX" (electron/main.ts).
 */
export const setWindowTitle = (id: string | undefined, title: string) => {
  if (isElectron()) {
    document.title = title;
  } else if (id) {
    void Windows?.setWindowTitle(id, title).catch(() => {});
  }
};

/**
 * Makes React Native's `AppState` turn inactive when another app comes to the
 * front of the Mac, and active when learnX is back, as it does on iPhone and
 * iPad. UIKit keeps a Mac app active either way, so what's checked again on
 * return (a permission changed in System Settings, a login gone stale) never
 * was. Sent as React Native's own app state event, which the native module
 * also sends; it skips a state it already reported. Returns the call that
 * stops it.
 */
export const followMacActivation = () => {
  const subscription = Windows?.addListener('onActiveChange', ({ active }) =>
    DeviceEventEmitter.emit('appStateDidChange', {
      app_state: active ? 'active' : 'inactive',
    }),
  );
  return () => subscription?.remove();
};
