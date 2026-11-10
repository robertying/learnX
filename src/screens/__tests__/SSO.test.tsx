import { act, render } from '@testing-library/react-native';
import { initialAuth, useAuthStore } from 'data/auth';
import { login } from 'data/login';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import SSO from 'screens/SSO';

let mockProps: Record<string, any> = {};
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => {
      mockProps = props;
      return <View testID="webview" />;
    },
  };
});
jest.mock('data/login', () => ({ login: jest.fn() }));
jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('helpers/fingerprint', () => ({
  generateFingerprint: () => 'device-fp',
}));

const ROAMING =
  'https://learn.tsinghua.edu.cn/f/j_spring_security_thauth_roaming_entry';

const navigation = { goBack: jest.fn() };
const renderScreen = () =>
  render(
    <SSO
      navigation={navigation as never}
      route={{ params: { username: 'u"1', password: 'p\\w' } } as never}
    />,
  );

const message = (data: unknown) =>
  act(() =>
    mockProps.onMessage({
      nativeEvent: {
        data: typeof data === 'string' ? data : JSON.stringify(data),
      },
    }),
  );
const submit = (requestBody: object, formId = 'theform') =>
  message({ type: 'JQUERY_SUBMIT', data: { formId, requestBody } });

beforeEach(() => {
  useAuthStore.setState({ ...initialAuth, ssoInProgress: true });
});

it('opens the SSO form fresh, filling the credentials and device into its script', async () => {
  await renderScreen();
  expect(mockProps.source.headers).toEqual({ Cookie: '' });
  expect(mockProps.injectedJavaScript).toContain(JSON.stringify('u"1'));
  expect(mockProps.injectedJavaScript).toContain(JSON.stringify('p\\w'));
  expect(mockProps.injectedJavaScript).toContain('"device-fp"');
  expect(
    mockProps.onShouldStartLoadWithRequest({
      url: 'https://id.tsinghua.edu.cn/x',
    }),
  ).toBe(true);
});

it('logs in with the captured form once the SSO hands over to Web Learning', async () => {
  await renderScreen();
  await message('not json');
  await message({ type: 'OTHER' });
  await submit({ fingerPrint: 'ignored' }, 'another');
  await submit({
    fingerPrint: 'fp',
    fingerGenPrint: 'g',
    fingerGenPrint3: 'g3',
  });

  expect(
    mockProps.onShouldStartLoadWithRequest({ url: `${ROAMING}?ticket=1` }),
  ).toBe(false);
  expect(login).toHaveBeenCalledWith({
    username: 'u"1',
    password: 'p\\w',
    fingerPrint: 'fp',
    fingerGenPrint: 'g',
    fingerGenPrint3: 'g3',
  });
  expect(useAuthStore.getState().ssoInProgress).toBe(false);
  expect(navigation.goBack).toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
});

it("fails without the form's device fingerprint", async () => {
  await renderScreen();
  expect(mockProps.onShouldStartLoadWithRequest({ url: ROAMING })).toBe(false);
  await submit({ fingerPrint: '' });
  mockProps.onShouldStartLoadWithRequest({ url: ROAMING });
  expect(login).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledTimes(2);
  expect(toast).toHaveBeenCalledWith(t('ssoFailed'), 'error');
  expect(useAuthStore.getState().ssoInProgress).toBe(false);
});

it('shows the progress while loading', async () => {
  const screen = await renderScreen();
  expect(screen.queryByTestId('progress')).toBeNull();
  await act(() => mockProps.onLoadProgress({ nativeEvent: { progress: 0.3 } }));
  expect(screen.getByTestId('progress')).toBeTruthy();
});
