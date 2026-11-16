import { AppState, type AppStateStatus } from 'react-native';
import Updater from 'modules/updater';
import { downloadInto } from 'services/files/downloads';
import {
  clearDownloadedUpdate,
  installsUpdate,
  installUpdate,
  needsInstallPermission,
  UpdateError,
} from 'services/update';

jest.mock('expo-file-system', () =>
  require('test-utils/mocks/memoryFileSystem'),
);
const { __fs } =
  jest.requireMock<typeof import('test-utils/mocks/memoryFileSystem')>(
    'expo-file-system',
  );

jest.mock('modules/updater', () => ({
  __esModule: true,
  default: {
    isSupported: true,
    canInstall: jest.fn(() => true),
    openInstallSettings: jest.fn(),
    install: jest.fn(() => new Promise(() => {})),
  },
}));
const updater = jest.mocked(Updater!);

jest.mock('services/files/downloads', () => ({
  downloadInto: jest.fn(),
}));

const release = {
  version: '20.0.0',
  url: 'https://mirror/learnX-arm64-v8a-v20.0.0.apk',
  sha256: 'abc123',
  size: 30_000_000,
};
const apk = 'file:///app/Caches/update/learnX-v20.0.0.apk';

/** The app's foreground state, as AppState reports it to listeners. */
let appStateListeners: ((state: AppStateStatus) => void)[] = [];
const setAppState = (state: AppStateStatus) => {
  AppState.currentState = state;
  appStateListeners.forEach(listener => listener(state));
};

beforeEach(() => {
  __fs.reset();
  appStateListeners = [];
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListeners.push(listener);
    return {
      remove: () => {
        appStateListeners = appStateListeners.filter(l => l !== listener);
      },
    };
  });
  jest.mocked(downloadInto).mockImplementation(async (_, file) => {
    file.writeSync('apk');
  });
});

/** Lets pending promise callbacks run. */
const settle = () =>
  new Promise<void>(resolve => setImmediate(() => resolve()));

const failure = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(UpdateError);
  return (error as UpdateError).code;
};

describe('installsUpdate', () => {
  it('installs a release with a checksum where the build may install', () => {
    expect(installsUpdate(release)).toBe(true);
    expect(installsUpdate({ ...release, sha256: undefined })).toBe(false);
  });

  it("doesn't where the build can't", () => {
    jest.replaceProperty(updater, 'isSupported', false);
    expect(installsUpdate(release)).toBe(false);
  });
});

it('says whether learnX still has to be allowed to install apps', () => {
  expect(needsInstallPermission()).toBe(false);
  updater.canInstall.mockReturnValueOnce(false);
  expect(needsInstallPermission()).toBe(true);
});

it('downloads the APK and installs it, then deletes it', async () => {
  const steps: string[] = [];
  const onProgress = jest.fn();
  updater.install.mockImplementationOnce(async uri => {
    expect(__fs.read(uri)).toBe('apk');
    // An update ends the app; here the install "finishes".
  });
  await installUpdate(release, {
    onStep: step => steps.push(step),
    onProgress,
  });
  expect(downloadInto).toHaveBeenCalledWith(
    release.url,
    expect.objectContaining({ uri: apk }),
    { onProgress },
  );
  expect(updater.install).toHaveBeenCalledWith(apk, 'abc123');
  expect(steps).toEqual(['downloading', 'installing']);
  expect(updater.openInstallSettings).not.toHaveBeenCalled();
  expect(__fs.files('file:///app')).toEqual([]);
  expect(appStateListeners).toEqual([]);
});

it('installs a download that finished in the background once the app is back', async () => {
  const steps: string[] = [];
  jest.mocked(downloadInto).mockImplementationOnce(async (_, file) => {
    setAppState('background');
    file.writeSync('apk');
  });
  updater.install.mockResolvedValueOnce(undefined);
  const done = installUpdate(release, { onStep: step => steps.push(step) });
  await settle();
  expect(updater.install).not.toHaveBeenCalled();
  expect(steps).toEqual(['downloading']);
  setAppState('active');
  await done;
  expect(updater.install).toHaveBeenCalledWith(apk, 'abc123');
  expect(steps).toEqual(['downloading', 'installing']);
  expect(appStateListeners).toEqual([]);
});

it('replaces an update an earlier run left behind', async () => {
  __fs.write('file:///app/Caches/update/learnX-v19.1.0.apk', 'old');
  updater.install.mockResolvedValueOnce(undefined);
  await installUpdate(release);
  expect(__fs.files('file:///app')).toEqual([]);
});

it('has people allow installing apps first, and goes on once they did', async () => {
  updater.canInstall.mockReturnValueOnce(false);
  updater.install.mockResolvedValueOnce(undefined);
  const done = installUpdate(release);
  await settle();
  expect(updater.openInstallSettings).toHaveBeenCalled();
  expect(downloadInto).not.toHaveBeenCalled();
  // Coming back without having left doesn't count.
  setAppState('active');
  await settle();
  expect(downloadInto).not.toHaveBeenCalled();
  setAppState('background');
  setAppState('active');
  await done;
  expect(updater.install).toHaveBeenCalledWith(apk, 'abc123');
});

it('stops when people come back without allowing it', async () => {
  updater.canInstall.mockReturnValue(false);
  const done = installUpdate(release);
  await settle();
  setAppState('background');
  setAppState('active');
  expect(await failure(done)).toBe('ERR_UPDATE_NOT_ALLOWED');
  expect(downloadInto).not.toHaveBeenCalled();
  updater.canInstall.mockReturnValue(true);
});

it('fails a download without installing', async () => {
  jest.mocked(downloadInto).mockRejectedValueOnce(new Error('HTTP 404'));
  expect(await failure(installUpdate(release))).toBe('ERR_UPDATE_DOWNLOAD');
  expect(updater.install).not.toHaveBeenCalled();
  expect(__fs.files('file:///app')).toEqual([]);
});

it('passes on why the install failed', async () => {
  updater.install.mockRejectedValueOnce(
    Object.assign(new Error('bad'), { code: 'ERR_UPDATE_CHECKSUM' }),
  );
  expect(await failure(installUpdate(release))).toBe('ERR_UPDATE_CHECKSUM');
  updater.install.mockRejectedValueOnce(new Error('unknown'));
  expect(await failure(installUpdate(release))).toBe('ERR_UPDATE_FAILED');
  expect(__fs.files('file:///app')).toEqual([]);
});

it("counts coming back from Android's confirmation without an answer as cancelled", async () => {
  jest.useFakeTimers();
  const done = installUpdate(release);
  const code = failure(done);
  await jest.advanceTimersByTimeAsync(0);
  expect(updater.install).toHaveBeenCalled();
  setAppState('background');
  setAppState('active');
  await jest.advanceTimersByTimeAsync(2999);
  setAppState('background');
  await jest.advanceTimersByTimeAsync(1);
  expect(await code).toBe('ERR_UPDATE_CANCELLED');
  expect(appStateListeners).toEqual([]);
});

it("refuses a release it can't install", async () => {
  expect(await failure(installUpdate({ ...release, sha256: undefined }))).toBe(
    'ERR_UPDATE_FAILED',
  );
});

it('clears a downloaded update quietly, also when there is none', () => {
  clearDownloadedUpdate();
  __fs.write(apk, 'apk');
  clearDownloadedUpdate();
  expect(__fs.files('file:///app')).toEqual([]);
});
