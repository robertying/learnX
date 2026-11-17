import { Keyboard, StyleSheet, View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import KeyboardInsetView from 'components/KeyboardInsetView';

let addListener: jest.SpiedFunction<typeof Keyboard.addListener>;
beforeEach(() => {
  addListener = jest.spyOn(Keyboard, 'addListener');
});
afterEach(() => {
  jest.useRealTimers();
});

const keyboardEvent = (name: string, event?: object) =>
  addListener.mock.calls
    .filter(([added]) => added === name)
    .forEach(([, listener]) => (listener as (event?: object) => void)(event));

const padding = () =>
  StyleSheet.flatten(screen.getByTestId('inset').props.style).paddingBottom;

it('ends above the keyboard, measured again once the navigation bar has hidden', async () => {
  jest.useFakeTimers();
  // The view ends at 800 on the screen, then at 848 without the navigation
  // bar under it.
  let bottom = 800;
  jest
    .spyOn(View.prototype, 'measureInWindow')
    .mockImplementation(callback =>
      (callback as (...frame: number[]) => void)(0, 100, 400, bottom - 100),
    );
  await render(<KeyboardInsetView testID="inset" style={{ flex: 1 }} />);
  expect(padding()).toBe(0);

  await act(() =>
    keyboardEvent('keyboardDidShow', { endCoordinates: { screenY: 600 } }),
  );
  expect(padding()).toBe(200);
  bottom = 848;
  await act(() => jest.advanceTimersByTime(300));
  expect(padding()).toBe(248);

  // A measurement still pending when the keyboard goes doesn't bring the
  // padding back.
  await act(() =>
    keyboardEvent('keyboardDidShow', { endCoordinates: { screenY: 600 } }),
  );
  await act(() => keyboardEvent('keyboardDidHide'));
  expect(padding()).toBe(0);
  await act(() => jest.advanceTimersByTime(300));
  expect(padding()).toBe(0);
});

it('never pads by a keyboard below it', async () => {
  jest
    .spyOn(View.prototype, 'measureInWindow')
    .mockImplementation(callback =>
      (callback as (...frame: number[]) => void)(0, 0, 400, 300),
    );
  await render(<KeyboardInsetView testID="inset" />);
  await act(() =>
    keyboardEvent('keyboardDidShow', { endCoordinates: { screenY: 600 } }),
  );
  expect(padding()).toBe(0);
});
