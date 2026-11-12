import { act, render, screen } from '@testing-library/react-native';
import App from 'App';
import { initialAuth, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';
import useStoresLoaded from 'hooks/useStoresLoaded';

jest.mock('navigation', () => ({ showMain }: { showMain: boolean }) => {
  const { Text } = require('react-native');
  return <Text>{showMain ? 'main' : 'login'}</Text>;
});
jest.mock('components/Splash', () => () => {
  const { Text } = require('react-native');
  return <Text>splash</Text>;
});
jest.mock('components/Toast', () => ({ toast: jest.fn(), Toast: () => null }));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: require('react-native').View,
}));
jest.mock('hooks/useStoresLoaded', () => jest.fn(() => true));
jest.mock('hooks/useReLogin', () => jest.fn());
jest.mock('hooks/useShareHandler', () => jest.fn());
jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

const signIn = (fingerPrint = 'fp') =>
  useCredentialsStore.setState({
    credentials: {
      username: 'u',
      password: 'p',
      fingerPrint,
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });

afterEach(() => {
  useAuthStore.setState(initialAuth);
  useCredentialsStore.setState({ credentials: null });
});

it('shows the splash until the stores have loaded', async () => {
  jest.mocked(useStoresLoaded).mockReturnValueOnce(false);
  await render(<App />);
  expect(screen.getByText('splash')).toBeTruthy();
});

it('shows the main UI only with a complete saved login', async () => {
  await render(<App />);
  expect(screen.getByText('login')).toBeTruthy();
  // A login from before SSO fingerprints can't log in again.
  await act(() => signIn(''));
  expect(screen.getByText('login')).toBeTruthy();
  await act(() => signIn());
  expect(screen.getByText('main')).toBeTruthy();
});

it('goes back to the login when asked to log in again', async () => {
  signIn();
  await render(<App />);
  await act(() => useAuthStore.setState({ reloginRequested: true }));
  expect(screen.getByText('login')).toBeTruthy();
});
