import { createElement } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import useAppCommand from 'hooks/useAppCommand';
import type { AppCommand } from 'modules/menus';
import { Windows } from 'modules/windows';
import { WindowProvider } from 'hooks/useWindow';

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
  mockListeners.clear();
  jest.mocked(Windows!.targetWindowId).mockReturnValue(null);
});

describe('useAppCommand', () => {
  it('runs the latest handler for its own command only', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = await renderHook(
      ({ handler }: { handler: () => void }) =>
        useAppCommand('refresh', handler),
      { initialProps: { handler: first } },
    );
    await choose('search');
    expect(first).not.toHaveBeenCalled();

    await choose('refresh');
    expect(first).toHaveBeenCalledTimes(1);

    await view.rerender({ handler: second });
    await choose('refresh');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops listening while disabled and after unmount', async () => {
    const handler = jest.fn();
    const view = await renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useAppCommand('nextItem', handler, enabled),
      { initialProps: { enabled: false } },
    );
    await choose('nextItem');
    expect(handler).not.toHaveBeenCalled();

    await view.rerender({ enabled: true });
    await choose('nextItem');
    expect(handler).toHaveBeenCalledTimes(1);

    await view.unmount();
    expect(mockListeners.size).toBe(0);
  });

  it('runs only in the key window when there are several', async () => {
    const inA = jest.fn();
    const inB = jest.fn();
    const inWindow =
      (windowId: string) =>
      ({ children }: React.PropsWithChildren) =>
        createElement(WindowProvider, { windowId }, children);
    await renderHook(() => useAppCommand('search', inA), {
      wrapper: inWindow('a'),
    });
    await renderHook(() => useAppCommand('search', inB), {
      wrapper: inWindow('b'),
    });
    jest.mocked(Windows!.targetWindowId).mockReturnValue('b');

    await choose('search');
    expect(inA).not.toHaveBeenCalled();
    expect(inB).toHaveBeenCalledTimes(1);
  });
});
