import { Alert, AlertButton } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { FailReason } from '@robertying/thu-learn-lib';
import { toast } from 'components/Toast';
import { t } from 'helpers/i18n';
import { initialAuth, useAuthStore } from 'data/auth';
import { Credentials, useCredentialsStore } from 'data/credentials';
import { login, loginWithOfflineMode } from 'data/login';
import { getSettings, resetSettings } from 'data/settings';
import { clearLoginCookies } from 'data/source';
import { MOCK_FINGER_PRINT } from 'helpers/mock';
import Login from 'screens/Login';
import env from 'test-utils/mocks/env';
import { screenProps } from 'test-utils/screenProps';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
const mockLiveLogin = jest.fn<
  { username: string; fingerPrint: string } | undefined,
  []
>(() => undefined);
jest.mock('services/launchOptions', () => ({
  getLiveLogin: () => mockLiveLogin(),
}));
jest.mock('data/login', () => ({
  login: jest.fn(),
  loginWithOfflineMode: jest.fn(),
}));
jest.mock('data/source', () => ({
  clearLoginCookies: jest.fn(() => Promise.resolve()),
}));

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
      {...screenProps({ navigation, route: { key: 'Login', name: 'Log In' } })}
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
  mockLiveLogin.mockReturnValue(undefined);
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

  it('moves to the password on Next and logs in on Done', async () => {
    await setup();
    const password = screen.getByTestId('login-password');
    await fireEvent(screen.getByTestId('login-username'), 'submitEditing');
    expect(password.props.focus).toHaveBeenCalledTimes(1);
    await fireEvent(password, 'submitEditing');
    expect(toast).toHaveBeenLastCalledWith(
      'Enter your username or student ID',
      'error',
    );
  });

  it('names its fields for screen readers', async () => {
    await setup();
    expect(screen.getByLabelText('Username or Student ID')).toBe(
      screen.getByTestId('login-username'),
    );
    expect(screen.getByLabelText('Password')).toBe(
      screen.getByTestId('login-password'),
    );
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

  it('logs the mock account in through the emulated server', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await setup();
    await fill(env.DUMMY_USERNAME, env.DUMMY_PASSWORD);
    await pressLogin();

    expect(login).toHaveBeenCalledWith({
      username: env.DUMMY_USERNAME,
      password: env.DUMMY_PASSWORD,
      fingerPrint: MOCK_FINGER_PRINT,
    });
    expect(alert).not.toHaveBeenCalled();
  });

  it('logs the live test account in with its launch fingerprint', async () => {
    mockLiveLogin.mockReturnValue({ username: 'live', fingerPrint: 'fp' });
    const alert = jest.spyOn(Alert, 'alert');
    const { navigation } = await setup();
    await fill('live', 'secret');
    await pressLogin();

    expect(login).toHaveBeenCalledWith({
      username: 'live',
      password: 'secret',
      fingerPrint: 'fp',
    });
    expect(alert).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('sends another account to SSO in a live run', async () => {
    mockLiveLogin.mockReturnValue({ username: 'live', fingerPrint: 'fp' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await setup();
    await fill('student', 'secret');
    await pressLogin();

    expect(login).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
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
      await user.press(screen.getByText('Log In with Saved Account'));
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
    expect(screen.queryByText('Log In with Saved Account')).toBeNull();
    expect(screen.queryByText('Continue Offline')).toBeNull();
  });

  it('says a login from here failed, once per attempt', async () => {
    await setup();
    await act(() => useAuthStore.setState({ loggingIn: true }));
    await act(() =>
      useAuthStore.setState({
        loggingIn: false,
        error: FailReason.BAD_CREDENTIAL,
        failure: 'rejected',
      }),
    );
    // Debug builds (tests run as one) add the reason and the server's answer.
    expect(toast).toHaveBeenLastCalledWith(
      `${t('loginFailed')}\n${FailReason.BAD_CREDENTIAL}`,
      'error',
      8000,
    );

    await act(() => useAuthStore.setState({ loggingIn: true, error: null }));
    await act(() =>
      useAuthStore.setState({
        loggingIn: false,
        error: FailReason.ERROR_FETCH_FROM_ID,
        errorDetail: 'Two-factor page',
        failure: 'rejected',
      }),
    );
    expect(toast).toHaveBeenLastCalledWith(
      `${t('loginFailed')}\n${FailReason.ERROR_FETCH_FROM_ID}: Two-factor page`,
      'error',
      8000,
    );
    expect(toast).toHaveBeenCalledTimes(2);

    // A state change that isn't the end of a login says nothing.
    await act(() => useAuthStore.setState({ ssoInProgress: true }));
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('says nothing when a login from here succeeds', async () => {
    await setup();
    await act(() => useAuthStore.setState({ loggingIn: true }));
    await act(() =>
      useAuthStore.setState({ loggingIn: false, loggedIn: true }),
    );
    expect(toast).not.toHaveBeenCalled();
  });
});
