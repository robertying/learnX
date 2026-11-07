import { renderHook } from '@testing-library/react-native';
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SWIPE_TAIL_MS } from 'helpers/cardActions';
import useCardSwipe from 'hooks/useCardSwipe';

const swipeable = () =>
  ({
    close: jest.fn(),
    openRight: jest.fn(),
  }) as unknown as SwipeableMethods & {
    close: jest.Mock;
    openRight: jest.Mock;
  };

const setup = async (
  props: { selectionMode?: boolean; reorderMode?: boolean } = {},
) => {
  const methods = swipeable();
  const hook = await renderHook(useCardSwipe, { initialProps: props });
  hook.result.current.snapRef.current = methods;
  return { ...hook, methods };
};

beforeEach(() => {
  jest.useFakeTimers({ now: 1_000_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCardSwipe', () => {
  it('lets presses through while the actions are closed', async () => {
    const { result, methods } = await setup();
    expect(result.current.interceptPress()).toBe(false);
    expect(methods.close).not.toHaveBeenCalled();
  });

  it('opens the actions on a long press', async () => {
    const { result, methods } = await setup();
    result.current.openActions();
    expect(methods.openRight).toHaveBeenCalled();
  });

  it('swallows the press that ends the swipe', async () => {
    const { result, methods } = await setup();
    result.current.onWillOpen();
    jest.advanceTimersByTime(SWIPE_TAIL_MS);
    expect(result.current.interceptPress()).toBe(true);
    expect(methods.close).not.toHaveBeenCalled();
  });

  it('closes the actions on a later tap instead of pressing', async () => {
    const { result, methods } = await setup();
    result.current.onWillOpen();
    jest.advanceTimersByTime(SWIPE_TAIL_MS + 1);
    expect(result.current.interceptPress()).toBe(true);
    expect(methods.close).toHaveBeenCalledTimes(1);
  });

  it('lets presses through again once closed', async () => {
    const { result } = await setup();
    result.current.onWillOpen();
    result.current.onWillClose();
    jest.advanceTimersByTime(SWIPE_TAIL_MS + 1);
    expect(result.current.interceptPress()).toBe(false);
  });

  it('closes when selection or reorder mode turns on', async () => {
    const { rerender, methods } = await setup();
    await rerender({ selectionMode: true });
    expect(methods.close).toHaveBeenCalledTimes(1);
    await rerender({ selectionMode: true, reorderMode: true });
    expect(methods.close).toHaveBeenCalledTimes(2);
    await rerender({ selectionMode: false, reorderMode: true });
    expect(methods.close).toHaveBeenCalledTimes(2);
  });
});
