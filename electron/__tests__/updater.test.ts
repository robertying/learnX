import { EventEmitter } from 'node:events';
import type { Logger } from 'electron-updater';
import {
  CHECK_INTERVAL,
  FIRST_CHECK_DELAY,
  RETRY_DELAY,
  createUpdater,
  debFileName,
  updateMode,
} from '../updater.ts';
import { packageConfig } from '../packageConfig.ts';

/** electron-updater's autoUpdater, as far as updater.ts uses it. */
const fakeAutoUpdater = () =>
  Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: true,
    allowDowngrade: true,
    logger: null as Logger | null,
    setFeedURL: jest.fn(),
    checkForUpdates: jest.fn(async () => null),
    quitAndInstall: jest.fn(),
  });

/** Where updates come from, read through the signature-checking provider. */
const feed = { url: 'https://mirror.test/LatestRelease/', provider: class {} };

beforeEach(() => jest.useFakeTimers());

describe('updateMode', () => {
  const packaged = { dev: false, env: {}, hasUpdateConfig: true };
  it.each([
    [{ ...packaged, platform: 'win32' }, 'install'],
    [
      {
        ...packaged,
        platform: 'linux',
        env: { APPIMAGE: '/a/learnX.AppImage' },
      },
      'install',
    ],
    // A .deb: its updates need an administrator, so it only says.
    [{ ...packaged, platform: 'linux', packageType: 'deb' }, 'notify'],
    [{ ...packaged, platform: 'linux' }, null],
    [{ ...packaged, platform: 'darwin' }, null],
    [{ ...packaged, dev: true, platform: 'win32' }, null],
    // An unpacked build (--dir).
    [{ ...packaged, platform: 'win32', hasUpdateConfig: false }, null],
  ])('%j: %s', (run, expected) => {
    expect(updateMode(run)).toBe(expected);
  });
});

it('names the .deb as the build does', () => {
  expect(debFileName('19.1.0', 'x64')).toBe('learnX-linux-amd64-v19.1.0.deb');
  expect(debFileName('19.1.0', 'arm64')).toBe('learnX-linux-arm64-v19.1.0.deb');
  expect(packageConfig().deb?.artifactName).toBe(
    'learnX-linux-${arch}-v${version}.${ext}',
  );
});

describe('in notify mode (a .deb)', () => {
  const setUp = () => {
    const autoUpdater = fakeAutoUpdater();
    const onReady = jest.fn();
    const updater = createUpdater({
      autoUpdater,
      feed,
      mode: 'notify',
      downloadUrl: version =>
        `https://mirror.test/learnX-linux-amd64-v${version}.deb`,
      onReady,
    });
    return { autoUpdater, onReady, updater };
  };

  it('downloads and installs nothing', () => {
    const { autoUpdater } = setUp();
    expect(autoUpdater).toMatchObject({
      autoDownload: false,
      autoInstallOnAppQuit: false,
    });
  });

  it('says when a verified update is out, with its download', async () => {
    const { autoUpdater, onReady, updater } = setUp();
    autoUpdater.emit('update-available', { version: '19.1.0' });
    const ready = {
      version: '19.1.0',
      download: 'https://mirror.test/learnX-linux-amd64-v19.1.0.deb',
    };
    expect(onReady).toHaveBeenCalledWith(ready);
    expect(updater.ready()).toEqual(ready);
    // Nothing to install, nor to check again for.
    updater.install();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    await updater.check();
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});

it('reads updates only through the signature-checking provider', () => {
  const autoUpdater = fakeAutoUpdater();
  createUpdater({ autoUpdater, feed, onReady: jest.fn() });
  expect(autoUpdater.setFeedURL).toHaveBeenCalledWith({
    provider: 'custom',
    updateProvider: feed.provider,
    url: feed.url,
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

it('tries again half an hour after the mirror had only part of a release', async () => {
  const autoUpdater = fakeAutoUpdater();
  const onReady = jest.fn();
  createUpdater({ autoUpdater, feed, onReady }).start();
  await jest.advanceTimersByTimeAsync(FIRST_CHECK_DELAY);
  expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  // latest.yml is there, the installer not yet: the download fails.
  autoUpdater.emit('error', new Error('Cannot download: status 404'));
  autoUpdater.emit('error', new Error('Cannot download: status 404'));
  await jest.advanceTimersByTimeAsync(RETRY_DELAY);
  expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  expect(onReady).not.toHaveBeenCalled();
  expect(RETRY_DELAY).toBeLessThan(CHECK_INTERVAL);
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
