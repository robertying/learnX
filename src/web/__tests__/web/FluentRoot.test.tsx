import { act, fireEvent, render, screen } from '@testing-library/react';
import * as ReactNative from 'react-native';
import { Switch } from '@fluentui/react-components';
import { Alert } from 'web/alert';
import FluentRoot from 'web/FluentRoot';

const tabster = () =>
  (window as unknown as { __tabsterInstance?: unknown }).__tabsterInstance;

it('keeps Tabster while the app runs, whatever Fluent controls show', () => {
  const { rerender, unmount } = render(
    <FluentRoot>
      <Switch label="Graduate" />
    </FluentRoot>,
  );
  expect(tabster()).toBeTruthy();
  // The last Fluent control goes, as the logout confirmation does.
  rerender(<FluentRoot />);
  expect(tabster()).toBeTruthy();
  unmount();
  expect(tabster()).toBeUndefined();
});

it("tells Chromium the page's appearance, for its scroll bars", () => {
  const scheme = jest
    .spyOn(ReactNative, 'useColorScheme')
    .mockReturnValue('light');
  const { rerender } = render(<FluentRoot />);
  expect(document.documentElement.style.colorScheme).toBe('light');
  scheme.mockReturnValue('dark');
  rerender(<FluentRoot />);
  expect(document.documentElement.style.colorScheme).toBe('dark');
});

it('gives the page back to assistive technology after an alert', async () => {
  jest.useFakeTimers();
  render(
    <FluentRoot>
      <div data-testid="page">Settings</div>
    </FluentRoot>,
  );
  act(() =>
    Alert.alert('Log Out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out' },
    ]),
  );
  act(() => jest.runOnlyPendingTimers());
  const page = screen.getByTestId('page');
  expect(page.closest('[aria-hidden="true"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
  // Tabster sees the dialog go (a mutation observer), then gives the page
  // back after a moment.
  await act(() => Promise.resolve());
  act(() => jest.advanceTimersByTime(1000));
  expect(page.closest('[aria-hidden="true"]')).toBeNull();
});
