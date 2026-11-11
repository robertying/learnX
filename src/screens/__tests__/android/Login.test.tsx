import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import Login from 'screens/Login';

jest.mock('data/login', () => ({
  login: jest.fn(),
  loginWithMockAccount: jest.fn(),
  loginWithOfflineMode: jest.fn(),
}));
jest.mock('data/source', () => ({
  clearLoginCookies: jest.fn(() => Promise.resolve()),
}));

it('start-aligns the login page on Android, as the welcome page is', async () => {
  await render(
    <Login
      navigation={{ navigate: jest.fn() } as never}
      route={{ key: 'Login', name: 'Log In' } as never}
    />,
  );
  const note = screen.getByText(
    'Your credentials are stored only on this device and protected by the system.',
  );
  expect(StyleSheet.flatten(note.props.style)).toMatchObject({
    textAlign: 'auto',
  });
  expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
});
