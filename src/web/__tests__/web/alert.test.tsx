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
