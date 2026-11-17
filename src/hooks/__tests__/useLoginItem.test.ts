import { Platform } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import useLoginItem from 'hooks/useLoginItem';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

afterEach(() => {
  uninstallBridge();
});

it('is offered only in the Electron app', async () => {
  const { result } = await renderHook(() => useLoginItem());
  expect(result.current).toBeNull();
});

describe('in the Electron app', () => {
  let bridge: ReturnType<typeof installBridge>;
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
    bridge = installBridge();
  });

  it('reads the system’s state, and writes only a change', async () => {
    const { result } = await renderHook(() => useLoginItem());
    await waitFor(() => expect(result.current?.enabled).toBe(false));
    await act(() => result.current!.set(false));
    expect(bridge.loginItem.set).not.toHaveBeenCalled();
    await act(() => result.current!.set(true));
    expect(bridge.loginItem.set).toHaveBeenCalledWith(true);
    expect(result.current!.enabled).toBe(true);
  });

  it('goes back when the system didn’t take it', async () => {
    jest.mocked(bridge.loginItem.set).mockResolvedValueOnce(false);
    const { result } = await renderHook(() => useLoginItem());
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
    const { result, unmount } = await renderHook(() => useLoginItem());
    await act(async () => {});
    expect(result.current).toBeNull();
    await unmount();

    jest.mocked(bridge.loginItem.get).mockRejectedValueOnce(new Error());
    const failed = await renderHook(() => useLoginItem());
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
    const { result, unmount } = await renderHook(() => useLoginItem());
    await unmount();
    await act(async () => answer({ supported: true, enabled: true }));
    expect(result.current).toBeNull();
  });
});
