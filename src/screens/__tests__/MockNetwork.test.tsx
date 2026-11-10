import {
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { login } from 'data/login';
import {
  defaultMockNetworkConfig,
  getMockNetworkConfig,
  setMockNetworkConfig,
} from 'data/mockSource';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import MockNetwork from 'screens/MockNetwork';

jest.mock('data/login', () => ({ login: jest.fn() }));
jest.mock('components/Toast', () => ({ toast: jest.fn() }));

afterEach(() => setMockNetworkConfig(defaultMockNetworkConfig));

const checked = (testID: string) =>
  within(screen.getByTestId(testID)).queryByTestId('icon-checkmark') !== null;

it('picks the latency and the request outcome, checking the current ones', async () => {
  const user = userEvent.setup();
  await render(<MockNetwork />);
  expect(checked('mock-network-latency-none')).toBe(
    defaultMockNetworkConfig.latency === 'none',
  );

  await user.press(screen.getByTestId('mock-network-latency-slow'));
  expect(getMockNetworkConfig().latency).toBe('slow');
  expect(checked('mock-network-latency-slow')).toBe(true);
  expect(checked('mock-network-latency-none')).toBe(false);

  await user.press(screen.getByTestId('mock-network-failure-timeout'));
  expect(getMockNetworkConfig().failure).toBe('timeout');
  expect(checked('mock-network-failure-timeout')).toBe(true);
});

it('rejects logins, and logs in again on demand', async () => {
  await render(<MockNetwork />);
  await fireEvent(
    screen.getByTestId('mock-network-login-fails'),
    'valueChange',
    true,
  );
  expect(getMockNetworkConfig().loginFails).toBe(true);

  await userEvent.press(screen.getByTestId('mock-network-relogin'));
  expect(login).toHaveBeenCalledWith({ reset: true });
  expect(toast).toHaveBeenCalledWith(t('loggingIn'), 'none', 1000);
});
