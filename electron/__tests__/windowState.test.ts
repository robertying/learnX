import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_SIZE,
  ZOOM_LIMITS,
  loadWindowState,
  saveWindowState,
  zoomForKey,
} from '../windowState.cjs';

let file: string;
beforeEach(() => {
  file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-window-')),
    'window-state.json',
  );
});
afterEach(() => {
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

const screen = [{ x: 0, y: 0, width: 1920, height: 1040 }];
const window = (bounds: object, maximized = false, zoom = 0) => ({
  webContents: { getZoomLevel: () => zoom },
  getNormalBounds: () => bounds as never,
  isMaximized: () => maximized,
});

it('opens at the default size the first time', () => {
  expect(loadWindowState(file, screen)).toEqual({
    bounds: DEFAULT_SIZE,
    maximized: false,
    zoom: 0,
  });
  fs.writeFileSync(file, 'not json');
  expect(loadWindowState(file, screen).bounds).toEqual(DEFAULT_SIZE);
});

it('comes back where it was, maximized or not', () => {
  const bounds = { x: 100, y: 50, width: 900, height: 700 };
  saveWindowState(file, window(bounds, true));
  expect(loadWindowState(file, screen)).toEqual({
    bounds,
    maximized: true,
    zoom: 0,
  });
  saveWindowState(file, window(bounds, false, 2));
  expect(loadWindowState(file, screen).zoom).toBe(2);
  // Out of the keys' reach, as a hand-edited file could be.
  saveWindowState(file, window(bounds, false, 40));
  expect(loadWindowState(file, screen).zoom).toBe(ZOOM_LIMITS.max);
});

it.each([
  ['on a display that’s gone', { x: 2500, y: 100, width: 900, height: 700 }],
  ['barely on screen', { x: 1880, y: 100, width: 900, height: 700 }],
  ['smaller than the app lays out', { x: 0, y: 0, width: 200, height: 700 }],
  ['not numbers', { x: '0', y: 0, width: 900, height: 700 }],
])('opens at the default size when the saved window is %s', (_name, bounds) => {
  saveWindowState(file, window(bounds));
  expect(loadWindowState(file, screen).bounds).toEqual(DEFAULT_SIZE);
});

it('keeps a window on a second display', () => {
  const bounds = { x: -1200, y: 0, width: 1000, height: 800 };
  saveWindowState(file, window(bounds));
  expect(
    loadWindowState(file, [
      ...screen,
      { x: -1280, y: 0, width: 1280, height: 1000 },
    ]).bounds,
  ).toEqual(bounds);
});

it('saves nothing where it can’t write', () => {
  expect(() =>
    saveWindowState(path.join(file, 'nested', 'x.json'), window({})),
  ).not.toThrow();
});

describe('zoomForKey', () => {
  const press = (key: string, extra: object = {}, platform = 'win32') =>
    zoomForKey(
      {
        type: 'keyDown',
        key,
        control: true,
        meta: false,
        alt: false,
        ...extra,
      },
      1,
      platform,
    );

  it.each([
    ['=', 1.5],
    ['+', 1.5],
    ['-', 0.5],
    ['_', 0.5],
    ['0', 0],
    ['a', null],
  ])('Ctrl+%s → %s', (key, level) => {
    expect(press(key)).toBe(level);
  });

  it('takes Cmd on macOS, and nothing with Alt or on key up', () => {
    expect(press('=', { control: false, meta: true }, 'darwin')).toBe(1.5);
    expect(press('=', {}, 'darwin')).toBeNull();
    expect(press('=', { alt: true })).toBeNull();
    expect(press('=', { type: 'keyUp' })).toBeNull();
  });

  it('stays within the zoom levels', () => {
    expect(
      zoomForKey(
        { type: 'keyDown', key: '=', control: true, meta: false, alt: false },
        ZOOM_LIMITS.max,
        'linux',
      ),
    ).toBe(ZOOM_LIMITS.max);
  });
});
