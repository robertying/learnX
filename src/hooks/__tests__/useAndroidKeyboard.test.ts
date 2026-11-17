import { Appearance, Keyboard, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import useAndroidKeyboard from 'hooks/useAndroidKeyboard';

let addListener: jest.SpiedFunction<typeof Keyboard.addListener>;
let addChangeListener: jest.SpiedFunction<typeof Appearance.addChangeListener>;
beforeEach(() => {
  addListener = jest.spyOn(Keyboard, 'addListener');
  addChangeListener = jest.spyOn(Appearance, 'addChangeListener');
});
afterEach(() => {
  jest.useRealTimers();
});

const keyboardEvent = (name: string, event?: object) =>
  (
    addListener.mock.calls.findLast(([added]) => added === name)![1] as (
      event?: object,
    ) => void
  )(event);
const switchAppearance = () =>
  (addChangeListener.mock.calls.at(-1)![0] as () => void)();

it('reports the keyboard coming and going on Android', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const onShow = jest.fn();
  const onHide = jest.fn();
  await renderHook(() => useAndroidKeyboard({ onShow, onHide }));
  await act(() =>
    keyboardEvent('keyboardDidShow', { endCoordinates: { screenY: 600 } }),
  );
  expect(onShow).toHaveBeenCalledWith(600);
  await act(() => keyboardEvent('keyboardDidHide'));
  expect(onHide).toHaveBeenCalledTimes(1);
});

it('counts a switch between light and dark as the keyboard going, and coming back if still up', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.useFakeTimers();
  const onShow = jest.fn();
  const onHide = jest.fn();
  await renderHook(() => useAndroidKeyboard({ onShow, onHide }));
  const isVisible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  jest
    .spyOn(Keyboard, 'metrics')
    .mockReturnValue({ screenX: 0, screenY: 640, width: 400, height: 300 });

  // Still up once the keyboard has restarted.
  await act(() => switchAppearance());
  expect(onHide).toHaveBeenCalledTimes(1);
  expect(onShow).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(300));
  expect(onShow).toHaveBeenCalledWith(640);

  // Gone with the switch: only hidden. Two switches in a row ask once.
  isVisible.mockReturnValue(false);
  await act(() => switchAppearance());
  await act(() => switchAppearance());
  await act(() => jest.advanceTimersByTime(300));
  expect(onHide).toHaveBeenCalledTimes(3);
  expect(onShow).toHaveBeenCalledTimes(1);
});

it('calls the latest handlers, and nothing once unmounted', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.useFakeTimers();
  const first = jest.fn();
  const second = jest.fn();
  const onShow = jest.fn();
  const hook = await renderHook(
    ({ onHide }: { onHide: () => void }) =>
      useAndroidKeyboard({ onShow, onHide }),
    { initialProps: { onHide: first } },
  );
  await hook.rerender({ onHide: second });
  await act(() => keyboardEvent('keyboardDidHide'));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);

  // The check after a switch doesn't outlive the hook.
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  jest
    .spyOn(Keyboard, 'metrics')
    .mockReturnValue({ screenX: 0, screenY: 640, width: 400, height: 300 });
  await act(() => switchAppearance());
  await hook.unmount();
  await act(() => jest.advanceTimersByTime(300));
  expect(onShow).not.toHaveBeenCalled();
});

it('does nothing on iOS', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await renderHook(() => useAndroidKeyboard({ onHide: jest.fn() }));
  expect(addListener).not.toHaveBeenCalled();
  expect(addChangeListener).not.toHaveBeenCalled();
});
