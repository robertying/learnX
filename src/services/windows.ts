import { DeviceEventEmitter } from 'react-native';
import { create } from 'zustand';
import { Windows } from 'modules/windows';
import { kvStorage } from 'data/storage';
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
  return () => {
    shownLinks.delete(id);
    useWindowsStore.setState(({ ids }) => ({
      ids: ids.filter(other => other !== id),
    }));
  };
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

/**
 * The learnx:// link of what each window shows, by id (the empty string with
 * one window), for a reload of the JS (`keepWindowLinksForReload`).
 */
const shownLinks = new Map<string, string>();

/**
 * What the window `id` shows (a tab, and the item open in it): reopened after
 * a reload of the JS on every platform, and after a relaunch on iPad and Mac
 * by the window's own restoration.
 */
export const setWindowLink = (id: string | undefined, link: string) => {
  shownLinks.set(id ?? '', link);
  if (id) {
    Windows?.setWindowLink(id, link);
  }
};

/** Where the windows' links wait for the JS a reload starts. */
export const RELOAD_LINKS_KEY = 'reloadWindowLinks';

/**
 * Saves what every window shows, just before an over-the-air update reloads
 * the JS, so each window opens there again (`takeReloadLink`) rather than at
 * its first tab. A window's id outlives the reload; its native restoration
 * only runs when the system connects it again, which a reload doesn't.
 */
export const keepWindowLinksForReload = () => {
  kvStorage.setItem(
    RELOAD_LINKS_KEY,
    JSON.stringify(Object.fromEntries(shownLinks)),
  );
};

/** Drops the saved links, e.g. when the reload didn't start. */
export const forgetWindowLinksForReload = () => {
  kvStorage.removeItem(RELOAD_LINKS_KEY);
};

let reloadLinks: Record<string, unknown> | null = null;

/**
 * The link the window `id` showed before the JS reloaded, once; undefined
 * after any other start. The saved links are read and deleted at the first
 * call, so a later launch never reopens them.
 */
export const takeReloadLink = (id: string | undefined) => {
  if (!reloadLinks) {
    reloadLinks = {};
    try {
      const saved = kvStorage.getItem(RELOAD_LINKS_KEY);
      if (typeof saved === 'string') {
        kvStorage.removeItem(RELOAD_LINKS_KEY);
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          reloadLinks = parsed as Record<string, unknown>;
        }
      }
    } catch {}
  }
  const key = id ?? '';
  const link = reloadLinks[key];
  delete reloadLinks[key];
  return typeof link === 'string' ? link : undefined;
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
