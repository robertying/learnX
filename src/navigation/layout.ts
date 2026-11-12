import { Platform } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';
import type { MainTabParams } from './types';

/** iOS lays out the split view natively; elsewhere it is drawn in JS. */
export const nativeSplit = Platform.OS === 'ios';

// The tabs as the sidebar of a single split, rather than a tab bar. On iPad, the
// tab bar turns into a sidebar of its own.
export const sidebarSplit = Platform.OS === 'ios' && DeviceInfo.isMac();

/** The tab the app opens on. */
export const initialTab: keyof MainTabParams = 'TodayStack';
