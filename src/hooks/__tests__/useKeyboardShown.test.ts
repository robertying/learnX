import { Keyboard, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import useKeyboardShown from 'hooks/useKeyboardShown';

const addListener = jest.spyOn(Keyboard, 'addListener');
const os = Platform.OS;

afterEach(() => {
  Platform.OS = os;
});

it('follows the keyboard on Android', async () => {
  Platform.OS = 'android';
  const hook = await renderHook(() => useKeyboardShown());
  const listener = (name: string) =>
    addListener.mock.calls.find(([event]) => event === name)![1] as () => void;
  await act(() => listener('keyboardDidShow')());
  expect(hook.result.current).toBe(true);
  await act(() => listener('keyboardDidHide')());
  expect(hook.result.current).toBe(false);
});

it('is always false on iOS', async () => {
  Platform.OS = 'ios';
  const hook = await renderHook(() => useKeyboardShown());
  expect(addListener).not.toHaveBeenCalled();
  expect(hook.result.current).toBe(false);
});
