import { act, renderHook } from '@testing-library/react-native';
import useItemStepping from 'hooks/useItemStepping';
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

afterEach(() => mockListeners.clear());

describe('useItemStepping', () => {
  it('opens the first or last item when none is open', async () => {
    const open = jest.fn();
    await renderHook(() => useItemStepping(3, -1, open, true));
    await choose('nextItem');
    expect(open).toHaveBeenLastCalledWith(0);
    await choose('previousItem');
    expect(open).toHaveBeenLastCalledWith(2);
  });

  it('steps from the open item and stops at either end', async () => {
    const open = jest.fn();
    const view = await renderHook(
      ({ opened }: { opened: number }) =>
        useItemStepping(3, opened, open, true),
      { initialProps: { opened: 1 } },
    );
    await choose('nextItem');
    expect(open).toHaveBeenLastCalledWith(2);
    await choose('previousItem');
    expect(open).toHaveBeenLastCalledWith(0);

    open.mockClear();
    await view.rerender({ opened: 2 });
    await choose('nextItem');
    await view.rerender({ opened: 0 });
    await choose('previousItem');
    expect(open).not.toHaveBeenCalled();
  });

  it('does nothing while disabled or with no items', async () => {
    const open = jest.fn();
    await renderHook(() => useItemStepping(3, -1, open, false));
    await renderHook(() => useItemStepping(0, -1, open, true));
    await choose('nextItem');
    await choose('previousItem');
    expect(open).not.toHaveBeenCalled();
  });
});
