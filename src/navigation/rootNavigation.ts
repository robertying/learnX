import { createContext, useContext } from 'react';
import {
  createNavigationContainerRef,
  type NavigationContainerRefWithCurrent,
} from '@react-navigation/native';
import type { RootStackParams } from './types';

export type RootNavigation = NavigationContainerRefWithCurrent<RootStackParams>;

/** A ref for a window's main navigation container (`navigation/index`). */
export const createRootNavigation = (): RootNavigation =>
  createNavigationContainerRef<RootStackParams>();

/**
 * This window's main navigation container, for screens that open a page over
 * the whole window from where they have no navigation prop for it: a split
 * view's detail pane is a navigation tree of its own (`DetailContainer`).
 * The root of Android and the Electron app has the same sheets under the same
 * names. One per window, since each window on iPad and Mac has its own
 * (`hooks/useWindow`).
 */
export const RootNavigationContext = createContext<RootNavigation | null>(null);

export const useRootNavigation = () => useContext(RootNavigationContext);
