import { act, renderHook, waitFor } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import useLoginItem from 'hooks/useLoginItem';
import { MenuBar } from 'modules/menubar';
import { recordError } from 'services/crashReporting';
// The Electron app's, which Metro picks on web.
import useElectronLoginItem from 'hooks/useLoginItem.web';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

jest.mock('modules/menubar', () => ({
  MenuBar: { getOpenAtLogin: jest.fn(), setOpenAtLogin: jest.fn() },
}));
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

afterEach(() => {
  uninstallBridge();
});

it('is never offered on iPhone or iPad', async () => {
  const { result } = await renderHook(() => useLoginItem());
  await act(async () => {});
  expect(result.current).toBeNull();
  expect(MenuBar!.getOpenAtLogin).not.toHaveBeenCalled();
});

describe('on the Mac', () => {
  beforeEach(() => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    jest.mocked(MenuBar!.getOpenAtLogin).mockResolvedValue('off');
  });

  it('reads the login item, and writes only a change', async () => {
    jest.mocked(MenuBar!.setOpenAtLogin).mockResolvedValue('on');
    const { result } = await renderHook(() => useLoginItem());
    await waitFor(() => expect(result.current?.enabled).toBe(false));
    await act(() => result.current!.set(false));
    expect(MenuBar!.setOpenAtLogin).not.toHaveBeenCalled();
    await act(() => result.current!.set(true));
    expect(MenuBar!.setOpenAtLogin).toHaveBeenCalledWith(true);
    expect(result.current!.enabled).toBe(true);
  });

  it('shows what macOS took, and goes back when it fails', async () => {
    // Turned off in System Settings, which only the user can change.
    jest
      .mocked(MenuBar!.setOpenAtLogin)
      .mockResolvedValueOnce('requiresApproval');
    const { result } = await renderHook(() => useLoginItem());
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(() => result.current!.set(true));
    expect(result.current!.enabled).toBe(false);

    const error = new Error('no login item');
    jest.mocked(MenuBar!.setOpenAtLogin).mockRejectedValueOnce(error);
    await act(() => result.current!.set(true));
    expect(result.current!.enabled).toBe(false);
    expect(recordError).toHaveBeenCalledWith(error, 'Changing Open at Login');
  });

  it('isn’t offered when reading fails, or after unmounting', async () => {
    jest.mocked(MenuBar!.getOpenAtLogin).mockRejectedValueOnce(new Error());
    const failed = await renderHook(() => useLoginItem());
    await act(async () => {});
    expect(failed.result.current).toBeNull();

    let answer: (state: 'on') => void = () => {};
    jest.mocked(MenuBar!.getOpenAtLogin).mockReturnValueOnce(
      new Promise(resolve => {
        answer = resolve;
      }),
    );
    const { result, unmount } = await renderHook(() => useLoginItem());
    await unmount();
    await act(async () => answer('on'));
    expect(result.current).toBeNull();
  });
});

describe('in the Electron app', () => {
  let bridge: ReturnType<typeof installBridge>;
  beforeEach(() => {
    bridge = installBridge();
  });

  it('reads the system’s state, and writes only a change', async () => {
    const { result } = await renderHook(() => useElectronLoginItem());
    await waitFor(() => expect(result.current?.enabled).toBe(false));
    await act(() => result.current!.set(false));
    expect(bridge.loginItem.set).not.toHaveBeenCalled();
    await act(() => result.current!.set(true));
    expect(bridge.loginItem.set).toHaveBeenCalledWith(true);
    expect(result.current!.enabled).toBe(true);
  });

  it('goes back when the system didn’t take it', async () => {
    jest.mocked(bridge.loginItem.set).mockResolvedValueOnce(false);
    const { result } = await renderHook(() => useElectronLoginItem());
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(() => result.current!.set(true));
    expect(result.current!.enabled).toBe(false);
    jest.mocked(bridge.loginItem.set).mockRejectedValueOnce(new Error());
    await act(() => result.current!.set(true));
    expect(result.current!.enabled).toBe(false);
  });

  it('isn’t offered where the system has none, or when reading fails', async () => {
    jest
      .mocked(bridge.loginItem.get)
      .mockResolvedValueOnce({ supported: false, enabled: false });
    const { result, unmount } = await renderHook(() => useElectronLoginItem());
    await act(async () => {});
    expect(result.current).toBeNull();
    await unmount();

    jest.mocked(bridge.loginItem.get).mockRejectedValueOnce(new Error());
    const failed = await renderHook(() => useElectronLoginItem());
    await act(async () => {});
    expect(failed.result.current).toBeNull();
  });

  it('ignores an answer after unmounting', async () => {
    let answer: (state: {
      supported: boolean;
      enabled: boolean;
    }) => void = () => {};
    jest.mocked(bridge.loginItem.get).mockReturnValueOnce(
      new Promise(resolve => {
        answer = resolve;
      }),
    );
    const { result, unmount } = await renderHook(() => useElectronLoginItem());
    await unmount();
    await act(async () => answer({ supported: true, enabled: true }));
    expect(result.current).toBeNull();
  });
});
