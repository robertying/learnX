import type { MenuBar as NativeMenuBar } from './index';

export type { MenuBarLabels, OpenAtLoginState } from './index';

/** The Electron app has a tray of its own (electron/system.ts). */
export const MenuBar: typeof NativeMenuBar = null;
