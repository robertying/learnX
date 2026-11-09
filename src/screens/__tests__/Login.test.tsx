import { Alert, AlertButton } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { toast } from 'components/Toast';
import { initialAuth, useAuthStore } from 'data/auth';
import {
  Credentials,
  getCredentials,
  useCredentialsStore,
} from 'data/credentials';
import { login, loginWithMockAccount, loginWithOfflineMode } from 'data/login';
import { getSettings, resetSettings } from 'data/settings';
import { clearLoginCookies } from 'data/source';
import { MOCK_FINGER_PRINT } from 'helpers/mock';
import Login from 'screens/Login';
import env from '../../../jest/env';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('data/login', () => ({
  login: jest.fn(),
  loginWithMockAccount: jest.fn(),
  loginWithOfflineMode: jest.fn(),
}));
jest.mock('data/source', () => ({
  clearLoginCookies: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-screens/experimental', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const saved: Credentials = {
  username: 'student',
  password: 'secret',
  fingerPrint: 'fp',
  fingerGenPrint: '',
  fingerGenPrint3: '',
};

const user = userEvent.setup();

const setup = async () => {
  const navigation = { navigate: jest.fn() };
  await render(
    <Login
      navigation={navigation as never}
      route={{ key: 'Login', name: 'Log In' } as never}
    />,
  );
  return { navigation };
};

const fill = async (username: string, password: string) => {
  await fireEvent.changeText(screen.getByTestId('login-username'), username);
  await fireEvent.changeText(screen.getByTestId('login-password'), password);
};

const pressLogin = () =>
  user.press(screen.getByRole('button', { name: 'Log In' }));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState(initialAuth);
  useCredentialsStore.setState({ credentials: null });
  resetSettings();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Login', () => {
  it('asks for a missing username, then a missing password', async () => {
    await setup();
    await pressLogin();
    expect(toast).toHaveBeenLastCalledWith(
      'Enter your username or student ID',
      'error',
    );

    await fireEvent.changeText(screen.getByTestId('login-username'), 'student');
    await pressLogin();
    expect(toast).toHaveBeenLastCalledWith('Enter your password', 'error');
    expect(login).not.toHaveBeenCalled();
  });

  it('confirms before handing a real account to the SSO page', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { navigation } = await setup();
    await fill(' student ', 'secret ');
    await pressLogin();

    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map(b => b.text)).toEqual(['Cancel', 'Continue']);
    expect(navigation.navigate).not.toHaveBeenCalled();

    await act(async () => {
      await buttons[1].onPress!();
    });
    expect(useAuthStore.getState().ssoInProgress).toBe(true);
    expect(clearLoginCookies).toHaveBeenCalled();
    // Typed spaces are trimmed
    expect(navigation.navigate).toHaveBeenCalledWith('SSO', {
      username: 'student',
      password: 'secret',
    });
  });

  it('keeps the ephemeral mock account in memory without logging in', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await setup();
    await fill(env.DUMMY_USERNAME, env.DUMMY_PASSWORD);
    await pressLogin();

    expect(loginWithMockAccount).toHaveBeenCalledTimes(1);
    expect(login).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    expect(getCredentials()).toMatchObject({
      username: env.DUMMY_USERNAME,
      password: env.DUMMY_PASSWORD,
      fingerPrint: MOCK_FINGER_PRINT,
    });
  });

  it('logs the persistent mock account in through the emulated server', async () => {
    await setup();
    await fill(env.DUMMY_PERSIST_USERNAME, env.DUMMY_PERSIST_PASSWORD);
    await pressLogin();

    expect(loginWithMockAccount).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({
      username: env.DUMMY_PERSIST_USERNAME,
      password: env.DUMMY_PERSIST_PASSWORD,
      fingerPrint: MOCK_FINGER_PRINT,
    });
  });

  it('turns the graduate setting on and off', async () => {
    await setup();
    const toggle = screen.getByRole('switch', { name: 'Graduate' });
    expect(toggle).not.toBeChecked();
    await fireEvent(toggle, 'valueChange', true);
    expect(getSettings().graduate).toBe(true);
    expect(toggle).toBeChecked();
  });

  it('disables the login button while logging in', async () => {
    useAuthStore.setState({ loggingIn: true });
    await setup();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeDisabled();
  });

  describe('with a saved login', () => {
    beforeEach(() => {
      useCredentialsStore.setState({ credentials: saved });
    });

    it('fills in the saved account', async () => {
      await setup();
      expect(screen.getByTestId('login-username').props.value).toBe('student');
      expect(screen.getByTestId('login-password').props.value).toBe('secret');
    });

    it('retries the saved login or goes offline', async () => {
      await setup();
      await user.press(screen.getByText('Log In With Saved Account'));
      expect(login).toHaveBeenCalledWith({ reset: true });
      await user.press(screen.getByText('Continue Offline'));
      expect(loginWithOfflineMode).toHaveBeenCalledTimes(1);
    });

    it('offers network emulation only to a mock account', async () => {
      await setup();
      expect(screen.queryByTestId('login-mock-network')).toBeNull();
    });
  });

  it('offers network emulation to a saved mock account', async () => {
    useCredentialsStore.setState({
      credentials: {
        ...saved,
        username: env.DUMMY_USERNAME,
        fingerPrint: MOCK_FINGER_PRINT,
      },
    });
    const { navigation } = await setup();
    await user.press(screen.getByTestId('login-mock-network'));
    expect(navigation.navigate).toHaveBeenCalledWith('MockNetwork');
  });

  it('has no retry or offline buttons without a saved login', async () => {
    await setup();
    expect(screen.queryByText('Log In With Saved Account')).toBeNull();
    expect(screen.queryByText('Continue Offline')).toBeNull();
  });
});
