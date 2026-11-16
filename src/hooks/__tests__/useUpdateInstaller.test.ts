import { Alert, type AlertButton, Linking } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { clearQueryCache } from 'data/queryClient';
import { t } from 'helpers/i18n';
import { getLatestRelease } from 'helpers/update';
import useUpdateInstaller from 'hooks/useUpdateInstaller';
import {
  installsUpdate,
  installUpdate,
  needsInstallPermission,
  type InstallUpdateOptions,
  UpdateError,
} from 'services/update';

jest.mock('helpers/update', () => ({ getLatestRelease: jest.fn() }));
jest.mock('services/update', () => ({
  ...jest.requireActual<typeof import('services/update')>('services/update'),
  installsUpdate: jest.fn(() => true),
  installUpdate: jest.fn(),
  needsInstallPermission: jest.fn(() => false),
}));

const release = {
  version: '20.0.0',
  url: 'https://mirror/learnX-arm64-v8a-v20.0.0.apk',
  sha256: 'abc',
  size: 31_500_000,
};

let alert: jest.SpyInstance;
let open: jest.SpyInstance;

beforeEach(() => {
  clearQueryCache();
  jest.mocked(getLatestRelease).mockRejectedValue(new Error('offline'));
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  open = jest.spyOn(Linking, 'openURL').mockResolvedValue();
});

/** The last alert's button titled `title`, pressed. */
const press = async (title: string) => {
  const buttons = alert.mock.lastCall?.[2] as AlertButton[];
  await act(async () => buttons.find(b => b.text === title)?.onPress?.());
};

/** An install that stays under way until `fail` is called. */
const pendingInstall = () => {
  let options: InstallUpdateOptions = {};
  let fail: (error: unknown) => void = () => {};
  jest.mocked(installUpdate).mockImplementationOnce((_, opts) => {
    options = opts ?? {};
    return new Promise((_resolve, reject) => {
      fail = reject;
    });
  });
  return {
    step: (...args: Parameters<NonNullable<InstallUpdateOptions['onStep']>>) =>
      act(() => options.onStep?.(...args)),
    progress: (value: number) => act(() => options.onProgress?.(value)),
    fail: (error: unknown) => act(async () => fail(error)),
  };
};

it('asks first, with the size, then downloads and installs', async () => {
  const install = pendingInstall();
  const { result } = await renderHook(() => useUpdateInstaller(release));
  await act(() => result.current.update());
  expect(alert).toHaveBeenCalledWith(
    t('updateTitle', { version: '20.0.0' }),
    t('updateDownloadsSize', { size: '31.5 MB' }),
    expect.any(Array),
  );
  expect(installUpdate).not.toHaveBeenCalled();

  await press(t('update'));
  expect(installUpdate).toHaveBeenCalledWith(release, expect.any(Object));
  expect(result.current.step).toBe('downloading');
  await install.progress(0.42);
  expect(result.current.progress).toBe(0.42);
  await install.step('installing');
  expect(result.current.step).toBe('installing');

  // A tap while it runs does nothing.
  alert.mockClear();
  await act(() => result.current.update());
  expect(alert).not.toHaveBeenCalled();

  await install.fail(new UpdateError('ERR_UPDATE_CANCELLED'));
  expect(result.current.step).toBeNull();
  // Declining Android's confirmation isn't an error.
  expect(alert).not.toHaveBeenCalled();
});

it('says Android will ask to allow installing apps, without a size it lacks', async () => {
  jest.mocked(needsInstallPermission).mockReturnValueOnce(true);
  const { result } = await renderHook(() =>
    useUpdateInstaller({ ...release, size: undefined }),
  );
  await act(() => result.current.update());
  expect(alert.mock.lastCall?.[1]).toBe(
    `${t('updateDownloads')}\n\n${t('updateAllowInstall')}`,
  );
  await press(t('cancel'));
  expect(installUpdate).not.toHaveBeenCalled();
});

it.each([
  ['ERR_UPDATE_DOWNLOAD', 'updateDownloadFailed'],
  ['ERR_UPDATE_CHECKSUM', 'updateVerifyFailed'],
  ['ERR_UPDATE_SIGNATURE', 'updateVerifyFailed'],
  ['ERR_UPDATE_NOT_ALLOWED', 'updateNotAllowed'],
  ['ERR_UPDATE_FAILED', 'updateInstallFailed'],
] as const)('explains %s', async (code, message) => {
  const install = pendingInstall();
  const { result } = await renderHook(() => useUpdateInstaller(release));
  await act(() => result.current.update());
  await press(t('update'));
  await install.fail(new UpdateError(code));
  expect(alert).toHaveBeenLastCalledWith(
    t('updateFailed'),
    t(message),
    expect.any(Array),
  );
});

it('offers to try again or to download in the browser after a failure', async () => {
  const first = pendingInstall();
  const { result } = await renderHook(() => useUpdateInstaller(release));
  await act(() => result.current.update());
  await press(t('update'));
  await first.fail(new Error('no code'));
  expect(alert.mock.lastCall?.[1]).toBe(t('updateInstallFailed'));

  await press(t('openInBrowser'));
  expect(open).toHaveBeenCalledWith(release.url);

  // latest.json can't be read again: the same release.
  pendingInstall();
  await press(t('tryAgain'));
  expect(installUpdate).toHaveBeenCalledTimes(2);
  expect(installUpdate).toHaveBeenLastCalledWith(release, expect.any(Object));
  expect(result.current.step).toBe('downloading');
});

it('tries again with latest.json read again', async () => {
  const first = pendingInstall();
  const { result } = await renderHook(() => useUpdateInstaller(release));
  await act(() => result.current.update());
  await press(t('update'));
  await first.fail(new UpdateError('ERR_UPDATE_CHECKSUM'));

  const fresh = { ...release, sha256: 'fixed' };
  jest.mocked(getLatestRelease).mockResolvedValueOnce(fresh);
  pendingInstall();
  await press(t('tryAgain'));
  expect(installUpdate).toHaveBeenLastCalledWith(fresh, expect.any(Object));
});

it("opens the APK in the browser where the app can't install it", async () => {
  jest.mocked(installsUpdate).mockReturnValueOnce(false);
  const { result } = await renderHook(() => useUpdateInstaller(release));
  await act(() => result.current.update());
  expect(open).toHaveBeenCalledWith(release.url);
  expect(alert).not.toHaveBeenCalled();
});

it('does nothing without a release', async () => {
  const { result } = await renderHook(() => useUpdateInstaller(null));
  await act(() => result.current.update());
  expect(alert).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});
