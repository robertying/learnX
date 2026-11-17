// The window's size, position and maximized state, kept across launches in
// the app's data folder (`window-state.json`), as Windows apps do.
const fs = require('node:fs');

/** The window's size the first time, or when the saved one doesn't fit. */
const DEFAULT_SIZE = { width: 1200, height: 800 };
/** The smallest window the app lays out. */
const MIN_SIZE = { minWidth: 360, minHeight: 480 };

/**
 * @typedef {{ x: number; y: number; width: number; height: number }} Bounds
 * @typedef {{ bounds: Bounds; maximized: boolean }} WindowState
 */

/** @param {unknown} value */
const isBounds = value => {
  const b = /** @type {Record<string, unknown> | null} */ (value);
  return (
    !!b &&
    ['x', 'y', 'width', 'height'].every(key => Number.isFinite(b[key])) &&
    /** @type {number} */ (b.width) >= MIN_SIZE.minWidth &&
    /** @type {number} */ (b.height) >= MIN_SIZE.minHeight
  );
};

/**
 * Whether enough of `bounds` lies on one of the displays to grab and move
 * it: a display unplugged since, or a resolution changed, could leave it off
 * every screen.
 * @param {Bounds} bounds
 * @param {Bounds[]} workAreas
 */
const onScreen = (bounds, workAreas) =>
  workAreas.some(area => {
    const width =
      Math.min(bounds.x + bounds.width, area.x + area.width) -
      Math.max(bounds.x, area.x);
    const height =
      Math.min(bounds.y + bounds.height, area.y + area.height) -
      Math.max(bounds.y, area.y);
    return width >= 100 && height >= 50;
  });

/**
 * The window's options from the saved state: its bounds when they're still
 * on a display, else the default size (centered), and whether to maximize.
 * @param {string} file
 * @param {Bounds[]} workAreas the displays' work areas now
 * @returns {{ bounds: Partial<Bounds> & { width: number; height: number }; maximized: boolean }}
 */
const loadWindowState = (file, workAreas) => {
  /** @type {unknown} */
  let saved;
  try {
    saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    saved = null;
  }
  const state = /** @type {Partial<WindowState> | null} */ (saved);
  const maximized = state?.maximized === true;
  return isBounds(state?.bounds) &&
    onScreen(/** @type {Bounds} */ (state?.bounds), workAreas)
    ? { bounds: /** @type {Bounds} */ (state?.bounds), maximized }
    : { bounds: DEFAULT_SIZE, maximized };
};

/**
 * Saves the window's state: its normal bounds (not the maximized ones), so
 * restoring it later goes back to them.
 * @param {string} file
 * @param {Pick<Electron.BrowserWindow, 'getNormalBounds' | 'isMaximized'>} win
 */
const saveWindowState = (file, win) => {
  try {
    /** @type {WindowState} */
    const state = {
      bounds: win.getNormalBounds(),
      maximized: win.isMaximized(),
    };
    fs.writeFileSync(file, JSON.stringify(state));
  } catch {
    // Next launch opens at the default size.
  }
};

module.exports = {
  DEFAULT_SIZE,
  MIN_SIZE,
  loadWindowState,
  onScreen,
  saveWindowState,
};
