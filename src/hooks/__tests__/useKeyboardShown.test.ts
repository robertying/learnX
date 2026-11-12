import { Keyboard, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import useKeyboardShown from 'hooks/useKeyboardShown';

let addListener: jest.SpiedFunction<typeof Keyboard.addListener>;
beforeEach(() => {
  addListener = jest.spyOn(Keyboard, 'addListener');
});

it('follows the keyboard on Android', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const hook = await renderHook(() => useKeyboardShown());
  const listener = (name: string) =>
    addListener.mock.calls.find(([event]) => event === name)![1] as () => void;
  await act(() => listener('keyboardDidShow')());
  expect(hook.result.current).toBe(true);
  await act(() => listener('keyboardDidHide')());
  expect(hook.result.current).toBe(false);
});

it('is always false on iOS', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const hook = await renderHook(() => useKeyboardShown());
  expect(addListener).not.toHaveBeenCalled();
  expect(hook.result.current).toBe(false);
});
