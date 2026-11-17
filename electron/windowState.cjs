// The window's size, position, maximized state and zoom, kept across
// launches in the app's data folder (`window-state.json`), as Windows apps
// do; and the keyboard's zoom (Ctrl or Cmd with =, - and 0), which the
// application menu gave before packaged builds dropped it.
const fs = require('node:fs');

/** The window's size the first time, or when the saved one doesn't fit. */
const DEFAULT_SIZE = { width: 1200, height: 800 };
/** The smallest window the app lays out. */
const MIN_SIZE = { minWidth: 360, minHeight: 480 };

/** Chromium's zoom levels the keys step through: 50% to 300%. */
const ZOOM_LIMITS = { min: -3.5, max: 6, step: 0.5 };

/**
 * @typedef {{ x: number; y: number; width: number; height: number }} Bounds
 * @typedef {{ bounds: Bounds; maximized: boolean; zoom: number }} WindowState
 */

/** A zoom level the keys can reach, or 0. */
const clampZoom = (/** @type {unknown} */ level) =>
  typeof level === 'number' && Number.isFinite(level)
    ? Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, level))
    : 0;

/**
 * The zoom level a key press asks for, or null for any other key: Ctrl (Cmd
 * on macOS) with = or + zooms in, with - out, and with 0 back to 100%, as
 * browsers do.
 * @param {Pick<Electron.Input, 'type' | 'key' | 'control' | 'meta' | 'alt'>} input
 * @param {number} level the page's zoom level now
 * @param {string} platform
 * @returns {number | null}
 */
const zoomForKey = (input, level, platform) => {
  const modifier = platform === 'darwin' ? input.meta : input.control;
  if (input.type !== 'keyDown' || !modifier || input.alt) {
    return null;
  }
  switch (input.key) {
    case '=':
    case '+':
      return clampZoom(level + ZOOM_LIMITS.step);
    case '-':
    case '_':
      return clampZoom(level - ZOOM_LIMITS.step);
    case '0':
      return 0;
    default:
      return null;
  }
};

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
 * @returns {{ bounds: Partial<Bounds> & { width: number; height: number }; maximized: boolean; zoom: number }}
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
  const zoom = clampZoom(state?.zoom);
  return isBounds(state?.bounds) &&
    onScreen(/** @type {Bounds} */ (state?.bounds), workAreas)
    ? { bounds: /** @type {Bounds} */ (state?.bounds), maximized, zoom }
    : { bounds: DEFAULT_SIZE, maximized, zoom };
};

/**
 * Saves the window's state: its normal bounds (not the maximized ones), so
 * restoring it later goes back to them, and the page's zoom.
 * @param {string} file
 * @param {Pick<Electron.BrowserWindow, 'getNormalBounds' | 'isMaximized'> & { webContents: Pick<Electron.WebContents, 'getZoomLevel'> }} win
 */
const saveWindowState = (file, win) => {
  try {
    /** @type {WindowState} */
    const state = {
      bounds: win.getNormalBounds(),
      maximized: win.isMaximized(),
      zoom: clampZoom(win.webContents.getZoomLevel()),
    };
    fs.writeFileSync(file, JSON.stringify(state));
  } catch {
    // Next launch opens at the default size.
  }
};

module.exports = {
  DEFAULT_SIZE,
  MIN_SIZE,
  ZOOM_LIMITS,
  loadWindowState,
  onScreen,
  saveWindowState,
  zoomForKey,
};
