import { act, renderHook } from '@testing-library/react-native';
import useAppCommand from 'hooks/useAppCommand';
import type { AppCommand } from 'modules/menus';

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
});
