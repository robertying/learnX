import { kvStorage } from 'data/storage';

// How the user laid out the Electron app's window: the list column's width
// (`SplitDivider`) and whether the navigation pane is expanded. Kept per
// install, as the window's size is (electron/windowState.ts), so they stay
// after logging out.
const MASTER_WIDTH_KEY = 'splitMasterWidth';
const PANE_EXPANDED_KEY = 'navigationPaneExpanded';

/** The list column's width the user dragged it to, if they did. */
export const savedMasterWidth = (): number | null => {
  const width = Number(kvStorage.getItem(MASTER_WIDTH_KEY));
  return Number.isFinite(width) && width > 0 ? width : null;
};

export const saveMasterWidth = (width: number) => {
  kvStorage.setItem(MASTER_WIDTH_KEY, String(Math.round(width)));
};

/**
 * Whether the user expanded (true) or collapsed (false) the navigation pane
 * with its menu button, or null when they never did and the window's width
 * decides.
 */
export const savedPaneExpanded = (): boolean | null => {
  const value = kvStorage.getItem(PANE_EXPANDED_KEY);
  return value === 'true' ? true : value === 'false' ? false : null;
};

export const savePaneExpanded = (expanded: boolean) => {
  kvStorage.setItem(PANE_EXPANDED_KEY, String(expanded));
};
