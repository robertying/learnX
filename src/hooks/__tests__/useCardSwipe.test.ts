import { renderHook } from '@testing-library/react-native';
import {
  SwipeableMethods,
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { SWIPE_TAIL_MS } from 'helpers/cardActions';
import useCardSwipe from 'hooks/useCardSwipe';

const swipeable = () =>
  ({
    close: jest.fn(),
  }) as unknown as SwipeableMethods & { close: jest.Mock };

const setup = async (
  props: { selectionMode?: boolean; reorderMode?: boolean } = {},
) => {
  const methods = swipeable();
  const onSwipe = jest.fn();
  const hook = await renderHook(
    (p: typeof props) => useCardSwipe({ ...p, onSwipe }),
    { initialProps: props },
  );
  hook.result.current.snapRef.current = methods;
  return { ...hook, methods, onSwipe };
};

const right = SwipeDirection.RIGHT;
const left = SwipeDirection.LEFT;

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

  it('swallows the press that ends the swipe', async () => {
    const { result, methods } = await setup();
    result.current.onWillOpen(left);
    jest.advanceTimersByTime(SWIPE_TAIL_MS);
    expect(result.current.interceptPress()).toBe(true);
    expect(methods.close).not.toHaveBeenCalled();
  });

  it('closes the actions on a later tap instead of pressing', async () => {
    const { result, methods } = await setup();
    result.current.onWillOpen(left);
    jest.advanceTimersByTime(SWIPE_TAIL_MS + 1);
    expect(result.current.interceptPress()).toBe(true);
    expect(methods.close).toHaveBeenCalledTimes(1);
  });

  it('lets presses through again once closed', async () => {
    const { result } = await setup();
    result.current.onWillOpen(left);
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

  it('closes the card left open when another starts swiping, as in Mail', async () => {
    const first = await setup();
    const second = await setup();
    first.result.current.onWillOpen(left);
    expect(first.methods.close).not.toHaveBeenCalled();

    second.result.current.onStartDrag();
    expect(first.methods.close).toHaveBeenCalledTimes(1);
    second.result.current.onWillOpen(left);
    expect(second.methods.close).not.toHaveBeenCalled();

    // once closed, it's left alone
    second.result.current.onWillClose();
    first.result.current.onStartDrag();
    expect(second.methods.close).not.toHaveBeenCalled();
  });

  describe('on iOS', () => {
    it('rests open on the button when let go short of a full swipe', async () => {
      const { result, methods, onSwipe } = await setup();
      result.current.onWillOpen(right);
      result.current.onOpen(right);
      expect(onSwipe).not.toHaveBeenCalled();
      expect(methods.close).not.toHaveBeenCalled();
    });

    it('runs the action of a full swipe and closes', async () => {
      const { result, methods, onSwipe } = await setup();
      result.current.onArmedChange('leading', true);
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      result.current.onWillOpen(right);
      expect(onSwipe).toHaveBeenCalledWith('leading');
      expect(methods.close).toHaveBeenCalledTimes(1);

      // armed only for that swipe
      result.current.onWillOpen(right);
      expect(onSwipe).toHaveBeenCalledTimes(1);
    });

    it('runs nothing once the swipe comes back short, or for the other side', async () => {
      const { result, onSwipe } = await setup();
      result.current.onArmedChange('trailing', true);
      result.current.onArmedChange('trailing', false);
      result.current.onWillOpen(left);
      result.current.onArmedChange('trailing', true);
      result.current.onWillOpen(right);
      expect(onSwipe).not.toHaveBeenCalled();
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
    });
  });
});
