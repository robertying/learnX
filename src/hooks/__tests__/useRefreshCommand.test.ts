import { act, renderHook } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import useRefreshCommand from 'hooks/useRefreshCommand';
import type { AppCommand } from 'modules/menus';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));

// The native module's events, as AppCommands.swift sends them.
const mockListeners = new Set<(event: { command: AppCommand }) => void>();
jest.mock('modules/menus', () => ({
  Menus: {
    addListener: (
      _event: 'onCommand',
      listener: (event: { command: AppCommand }) => void,
    ) => {
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    },
  },
}));

const choose = (command: AppCommand) =>
  act(() => mockListeners.forEach(l => l({ command })));

afterEach(() => {
  mockFocused = true;
  mockListeners.clear();
});

describe('useRefreshCommand', () => {
  it('refreshes with ⌘R while focused, enabled and not refreshing', async () => {
    const onRefresh = jest.fn();
    const view = await renderHook(
      ({ refreshing, enabled }: { refreshing: boolean; enabled: boolean }) =>
        useRefreshCommand({ refreshing, onRefresh }, enabled),
      { initialProps: { refreshing: false, enabled: true } },
    );
    await choose('refresh');
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await view.rerender({ refreshing: true, enabled: true });
    await choose('refresh');
    await view.rerender({ refreshing: false, enabled: false });
    await choose('refresh');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('leaves ⌘R to the focused screen', async () => {
    mockFocused = false;
    const onRefresh = jest.fn();
    await renderHook(() => useRefreshCommand({ refreshing: false, onRefresh }));
    await choose('refresh');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('gives a header button on Mac only, turning and waiting while refreshing', async () => {
    const onRefresh = jest.fn();
    const iPhone = await renderHook(() =>
      useRefreshCommand({ refreshing: false, onRefresh }),
    );
    expect(iPhone.result.current).toBe(false);

    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    const mac = await renderHook(
      ({ refreshing }: { refreshing: boolean }) =>
        useRefreshCommand({ refreshing, onRefresh }),
      { initialProps: { refreshing: false } },
    );
    const button = mac.result.current;
    expect(button).toMatchObject({ id: 'refresh', label: 'Refresh' });
    if (button) {
      button.onPress();
    }
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await mac.rerender({ refreshing: true });
    expect(mac.result.current).toMatchObject({
      disabled: true,
      sfSymbol: 'arrow.trianglehead.2.clockwise.rotate.90',
    });
  });
});
