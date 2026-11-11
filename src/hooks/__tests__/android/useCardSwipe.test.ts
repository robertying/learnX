import { renderHook } from '@testing-library/react-native';
import {
  SwipeableMethods,
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import useCardSwipe from 'hooks/useCardSwipe';

it('runs the action once the card has slid all the way open, then closes', async () => {
  const onSwipe = jest.fn();
  const close = jest.fn();
  const { result } = await renderHook(() => useCardSwipe({ onSwipe }));
  result.current.snapRef.current = { close } as unknown as SwipeableMethods;

  // a full swipe is armed, but the card still slides off first
  result.current.onArmedChange('trailing', true);
  result.current.onWillOpen(SwipeDirection.LEFT);
  expect(onSwipe).not.toHaveBeenCalled();

  result.current.onOpen(SwipeDirection.LEFT);
  expect(onSwipe).toHaveBeenCalledWith('trailing');
  expect(close).toHaveBeenCalledTimes(1);

  // a fling opens it without arming
  result.current.onOpen(SwipeDirection.RIGHT);
  expect(onSwipe).toHaveBeenLastCalledWith('leading');
});
