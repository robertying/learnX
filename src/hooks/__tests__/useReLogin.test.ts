import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { initialAuth, useAuthStore } from 'data/auth';
import { saveCredentials, clearCredentials } from 'data/credentials';
import { login } from 'data/login';
import useReLogin from 'hooks/useReLogin';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('data/login', () => ({ login: jest.fn(async () => {}) }));

const credentials = {
  username: 'student',
  password: 'secret',
  fingerPrint: 'fp',
  fingerGenPrint: '',
  fingerGenPrint3: '',
};

beforeEach(async () => {
  jest.useFakeTimers();
  // The preset's AppState has no state of its own.
  (AppState as { currentState: string }).currentState = 'active';
  jest.mocked(login).mockClear();
  useAuthStore.setState(initialAuth);
  await saveCredentials(credentials);
});

afterEach(async () => {
  jest.useRealTimers();
  await clearCredentials();
});

/** Renders the hook and lets its launch login through. */
const launch = async () => {
  await renderHook(useReLogin);
  expect(login).toHaveBeenCalledTimes(1);
  jest.mocked(login).mockClear();
};

const fail = (failure: 'offline' | 'rejected') =>
  act(() => {
    useAuthStore.setState({ loggingIn: false, loggedIn: false, failure });
  });

describe('useReLogin', () => {
  it('logs in at launch', async () => {
    await renderHook(useReLogin);
    expect(login).toHaveBeenCalledWith({ reset: true });
  });

  it('retries less and less often while offline', async () => {
    await launch();
    await fail('offline');

    await act(() => jest.advanceTimersByTime(29 * 1000));
    expect(login).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(1000));
    expect(login).toHaveBeenCalledTimes(1);

    // The retry starts a login, which fails again.
    await act(() => useAuthStore.setState({ loggingIn: true }));
    await fail('offline');
    await act(() => jest.advanceTimersByTime(59 * 1000));
    expect(login).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(1000));
    expect(login).toHaveBeenCalledTimes(2);
  });

  it('does not retry a login the server turned down', async () => {
    await launch();
    await fail('rejected');
    await act(() => jest.advanceTimersByTime(60 * 60 * 1000));
    expect(login).not.toHaveBeenCalled();
  });

  it('does not retry while the login screen is shown', async () => {
    await launch();
    await act(() => useAuthStore.setState({ reloginRequested: true }));
    await fail('offline');
    await act(() => jest.advanceTimersByTime(60 * 60 * 1000));
    expect(login).not.toHaveBeenCalled();
  });
});
