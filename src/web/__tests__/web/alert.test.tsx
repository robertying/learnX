import { act, fireEvent, render, screen } from '@testing-library/react';
import { Alert as ReactNativeAlert } from 'react-native';
import { t } from 'helpers/i18n';
import { Alert, orderedButtons } from 'web/alert';
import FluentRoot from 'web/FluentRoot';

const renderRoot = () => render(<FluentRoot />);

it('is the Alert React Native Web gives the app', () => {
  expect(ReactNativeAlert.alert).toBe(Alert.alert);
});

it('puts Cancel after the actions, as Windows does', () => {
  expect(
    orderedButtons([
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive' },
      { text: 'Keep' },
    ]).map(button => button.text),
  ).toEqual(['Delete', 'Keep', 'Cancel']);
});

it('shows an alert as a dialog and runs the button pressed', () => {
  renderRoot();
  const onLogout = jest.fn();
  act(() =>
    Alert.alert('Log Out?', 'Your data is removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]),
  );
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByText('Your data is removed.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Log Out' }));
  expect(onLogout).toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('shows alerts one at a time, with OK when none is given', () => {
  renderRoot();
  act(() => {
    Alert.alert('First');
    Alert.alert('Second', undefined, [
      { text: 'Keep' },
      { text: 'Discard', style: 'destructive' },
    ]);
  });
  expect(screen.getByText('First')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: t('ok') }));
  expect(screen.getByText('Second')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('cancels on Escape', () => {
  renderRoot();
  const onCancel = jest.fn();
  const onDismiss = jest.fn();
  act(() =>
    Alert.alert(
      'Choose',
      undefined,
      [{ text: 'Cancel', style: 'cancel', onPress: onCancel }, { text: 'Go' }],
      { onDismiss },
    ),
  );
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onCancel).toHaveBeenCalled();
  expect(onDismiss).toHaveBeenCalled();
  expect(() => Alert.prompt()).not.toThrow();
});

it('leaves the press that asked for it alone, until its key is released', () => {
  renderRoot();
  const onContinue = jest.fn();
  // Enter in a text field asks for the alert, between its keydown and
  // keypress.
  fireEvent.keyDown(window, { key: 'Enter' });
  act(() =>
    Alert.alert('Log In?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: onContinue },
    ]),
  );
  const button = screen.getByRole('button', { name: 'Continue' });
  // The rest of that press, and its auto-repeat, are swallowed.
  expect(fireEvent.keyPress(button, { key: 'Enter', charCode: 13 })).toBe(
    false,
  );
  expect(fireEvent.keyDown(button, { key: 'Enter', repeat: true })).toBe(false);
  // Other keys aren't.
  expect(fireEvent.keyDown(button, { key: 'a' })).toBe(true);
  fireEvent.keyUp(window, { key: 'Enter' });
  // A new press is the user's answer.
  expect(fireEvent.keyDown(button, { key: 'Enter' })).toBe(true);
  expect(fireEvent.keyPress(button, { key: 'Enter', charCode: 13 })).toBe(true);
  fireEvent.keyUp(window, { key: 'Enter' });
  fireEvent.click(button);
  expect(onContinue).toHaveBeenCalledTimes(1);
});

it('lets every key through when none was down as it opened', () => {
  renderRoot();
  act(() => Alert.alert('Saved'));
  expect(
    fireEvent.keyPress(screen.getByRole('button', { name: t('ok') }), {
      key: 'Enter',
      charCode: 13,
    }),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: t('ok') }));
});

it('forgets the keys down when the window loses focus', () => {
  renderRoot();
  fireEvent.keyDown(window, { key: 'Enter' });
  fireEvent.blur(window);
  act(() => Alert.alert('Saved'));
  expect(
    fireEvent.keyPress(screen.getByRole('button', { name: t('ok') }), {
      key: 'Enter',
      charCode: 13,
    }),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: t('ok') }));
});
