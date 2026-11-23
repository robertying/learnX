import type NativeBackgroundRefresh from './index';

export type { BackgroundRefreshState } from './index';

/** Windows and Linux have no system setting that stops the Electron app's sync. */
const BackgroundRefresh: typeof NativeBackgroundRefresh = null;

export default BackgroundRefresh;
