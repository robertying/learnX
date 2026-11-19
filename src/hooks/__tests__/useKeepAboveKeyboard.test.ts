import { Keyboard, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import useKeepAboveKeyboard from 'hooks/useKeepAboveKeyboard';

let addListener: jest.SpiedFunction<typeof Keyboard.addListener>;
beforeEach(() => {
  addListener = jest.spyOn(Keyboard, 'addListener');
});

const showKeyboard = (screenY: number) =>
  (
    addListener.mock.calls.findLast(
      ([name]) => name === 'keyboardWillShow',
    )![1] as (event: object) => void
  )({ endCoordinates: { screenY } });

// A view 100 high at `y` in the window, in a scroll view scrolled to 50.
const setUp = async (y: number) => {
  const scrollTo = jest.fn();
  const scrollView = { current: { scrollTo } } as never;
  const view = {
    current: {
      measureInWindow: (
        callback: (x: number, y: number, w: number, h: number) => void,
      ) => callback(0, y, 300, 100),
    },
  } as never;
  const { result } = await renderHook(() =>
    useKeepAboveKeyboard(scrollView, view),
  );
  result.current({ nativeEvent: { contentOffset: { y: 50 } } } as never);
  return scrollTo;
};

it('scrolls on until the whole view and a margin clear the keyboard', async () => {
  const scrollTo = await setUp(500);
  // The view ends at 600, the margin at 616: 16 under the keyboard at 600.
  await act(() => showKeyboard(600));
  expect(scrollTo).toHaveBeenCalledWith({ y: 66, animated: true });
});

it('leaves a view that already clears the keyboard', async () => {
  const scrollTo = await setUp(300);
  await act(() => showKeyboard(600));
  expect(scrollTo).not.toHaveBeenCalled();
});

it('does nothing on Android, where the page avoids the keyboard itself', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await setUp(500);
  expect(
    addListener.mock.calls.some(([name]) => name === 'keyboardWillShow'),
  ).toBe(false);
});
