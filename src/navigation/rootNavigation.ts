import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParams } from './types';

/**
 * The main navigation container, for screens that open a page over the whole
 * window from where they have no navigation prop for it: a split view's
 * detail pane is a navigation tree of its own (`DetailContainer`). Android's
 * root has the same sheets under the same names.
 */
export const rootNavigation = createNavigationContainerRef<RootStackParams>();
