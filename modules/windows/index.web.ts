import type { Windows as NativeWindows } from './index';

/**
 * The Electron app has no native window module: each window is its own
 * process with one root, so `services/windows` sees a single window.
 */
export const Windows: typeof NativeWindows = null;
