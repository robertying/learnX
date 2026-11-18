import { act, renderHook, waitFor } from '@testing-library/react-native';
import useAppLanguage from 'hooks/useAppLanguage';
// The Electron app's, which Metro picks on web.
import useElectronAppLanguage from 'hooks/useAppLanguage.web';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

afterEach(() => {
  uninstallBridge();
});

it('is never offered on the phones', async () => {
  const { result } = await renderHook(() => useAppLanguage());
  expect(result.current).toBeNull();
});

describe('in the Electron app', () => {
  let bridge: ReturnType<typeof installBridge>;
  beforeEach(() => {
    bridge = installBridge();
  });

  it('reads the choice, saves a new one and relaunches', async () => {
    const { result } = await renderHook(() => useElectronAppLanguage());
    await waitFor(() => expect(result.current?.language).toBe('system'));
    await act(async () => {
      await expect(result.current!.set('zh-CN')).resolves.toBe(true);
    });
    expect(bridge.language.set).toHaveBeenCalledWith('zh-CN');
    expect(result.current!.language).toBe('zh-CN');
    result.current!.relaunch();
    expect(bridge.relaunch).toHaveBeenCalled();
  });

  it('keeps the choice when it isn’t saved', async () => {
    const { result } = await renderHook(() => useElectronAppLanguage());
    await waitFor(() => expect(result.current).not.toBeNull());
    jest.mocked(bridge.language.set).mockResolvedValueOnce(false);
    await act(async () => {
      await expect(result.current!.set('en-US')).resolves.toBe(false);
    });
    jest.mocked(bridge.language.set).mockRejectedValueOnce(new Error());
    await act(async () => {
      await expect(result.current!.set('en-US')).resolves.toBe(false);
    });
    expect(result.current!.language).toBe('system');
  });

  it('isn’t offered where the system has a per-app language, or when reading fails', async () => {
    jest
      .mocked(bridge.language.get)
      .mockResolvedValueOnce({ supported: false, language: 'system' });
    const { result, unmount } = await renderHook(() =>
      useElectronAppLanguage(),
    );
    await act(async () => {});
    expect(result.current).toBeNull();
    await unmount();

    jest.mocked(bridge.language.get).mockRejectedValueOnce(new Error());
    const failed = await renderHook(() => useElectronAppLanguage());
    await act(async () => {});
    expect(failed.result.current).toBeNull();
  });
});
