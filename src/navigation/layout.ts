import DeviceInfo from 'constants/DeviceInfo';
import type { MainTabParams } from './types';
import { isApple } from 'helpers/platform';

/** iOS lays out the split view natively; elsewhere it is drawn in JS. */
export const nativeSplit = isApple();

// The tabs as the sidebar of a single split, rather than a tab bar. On iPad, the
// tab bar turns into a sidebar of its own.
export const sidebarSplit = isApple() && DeviceInfo.isMac();

/** The tab the app opens on. */
export const initialTab: keyof MainTabParams = 'TodayStack';
