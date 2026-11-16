import { EventEmitter } from 'node:events';
import {
  CHECK_INTERVAL,
  FIRST_CHECK_DELAY,
  createUpdater,
  updatesSupported,
} from '../updater.cjs';

/** electron-updater's autoUpdater, as far as updater.cjs uses it. */
const fakeAutoUpdater = () =>
  Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: true,
    allowDowngrade: true,
    logger: null as null | Record<string, (message: string) => void>,
    setFeedURL: jest.fn(),
    checkForUpdates: jest.fn(async () => null),
    quitAndInstall: jest.fn(),
  });

const feed = {
  provider: 'custom',
  url: 'https://github.com/robertying/learnX',
};

beforeEach(() => jest.useFakeTimers());

describe('updatesSupported', () => {
  it.each([
    [{ dev: false, platform: 'win32', env: {} }, true],
    [
      {
        dev: false,
        platform: 'linux',
        env: { APPIMAGE: '/a/learnX.AppImage' },
      },
      true,
    ],
    // A .deb: its package manager updates it.
    [{ dev: false, platform: 'linux', env: {} }, false],
    [{ dev: false, platform: 'darwin', env: {} }, false],
    [{ dev: true, platform: 'win32', env: {} }, false],
  ])('%j: %s', (run, expected) => {
    expect(updatesSupported(run)).toBe(expected);
  });
});

it('downloads in the background and installs on quit', () => {
  const autoUpdater = fakeAutoUpdater();
  createUpdater({ autoUpdater, feed, onReady: jest.fn() });
  expect(autoUpdater).toMatchObject({
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    allowDowngrade: false,
  });
  expect(autoUpdater.setFeedURL).toHaveBeenCalledWith(feed);
});

it('checks after launch and every few hours', async () => {
  const autoUpdater = fakeAutoUpdater();
  createUpdater({ autoUpdater, feed, onReady: jest.fn() }).start();
  expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(FIRST_CHECK_DELAY);
  expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(CHECK_INTERVAL);
  expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  expect(CHECK_INTERVAL).toBe(4 * 60 * 60 * 1000);
});

it('tells the page once an update has downloaded, and stops checking', async () => {
  const autoUpdater = fakeAutoUpdater();
  const onReady = jest.fn();
  const updater = createUpdater({ autoUpdater, feed, onReady });
  expect(updater.ready()).toBeNull();
  autoUpdater.emit('update-downloaded', { version: '19.0.1' });
  expect(onReady).toHaveBeenCalledWith({ version: '19.0.1' });
  expect(updater.ready()).toEqual({ version: '19.0.1' });
  await updater.check();
  expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
});

it('runs one check at a time', async () => {
  const autoUpdater = fakeAutoUpdater();
  let finish = () => {};
  autoUpdater.checkForUpdates.mockReturnValueOnce(
    new Promise(resolve => {
      finish = () => resolve(null);
    }),
  );
  const updater = createUpdater({ autoUpdater, feed, onReady: jest.fn() });
  const first = updater.check();
  await updater.check();
  expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  finish();
  await first;
  await updater.check();
  expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
});

it('logs a failed check and tries again later', async () => {
  const autoUpdater = fakeAutoUpdater();
  const log = jest.fn();
  autoUpdater.checkForUpdates.mockRejectedValueOnce(new Error('offline'));
  const updater = createUpdater({ autoUpdater, feed, onReady: jest.fn(), log });
  await updater.check();
  autoUpdater.emit('error', new Error('offline'));
  expect(log).toHaveBeenCalledWith('failed: offline');
  autoUpdater.logger?.warn?.('slow');
  autoUpdater.logger?.error?.('bad');
  autoUpdater.logger?.info?.('quiet');
  autoUpdater.logger?.debug?.('quiet');
  expect(log).toHaveBeenCalledWith('warn: slow');
  expect(log).toHaveBeenCalledWith('error: bad');
  expect(log).toHaveBeenCalledTimes(3);
  await updater.check();
  expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
});

it('restarts into the installer only when an update is waiting', () => {
  const autoUpdater = fakeAutoUpdater();
  const updater = createUpdater({ autoUpdater, feed, onReady: jest.fn() });
  updater.install();
  expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  autoUpdater.emit('update-downloaded', { version: '19.0.1' });
  updater.install();
  expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(true, true);
});

it('logs nowhere by default', () => {
  const autoUpdater = fakeAutoUpdater();
  createUpdater({ autoUpdater, feed, onReady: jest.fn() });
  expect(() => autoUpdater.emit('error', new Error('x'))).not.toThrow();
});
