import { Alert, Linking } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { initialAuth, useAuthStore } from 'data/auth';
import { login } from 'data/login';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import SSO, { TRUSTED_BROWSERS_URL } from 'screens/SSO';
import { screenProps } from 'test-utils/screenProps';

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
      {...screenProps({
        navigation,
        route: { params: { username: 'u"1', password: 'p\\w' } },
      })}
    />,
  );

const message = (data: unknown, url = 'https://id.tsinghua.edu.cn/do/x') =>
  act(() =>
    mockProps.onMessage({
      nativeEvent: {
        url,
        data: typeof data === 'string' ? data : JSON.stringify(data),
      },
    }),
  );
const submit = (requestBody: object, formId = 'theform', url?: string) =>
  message({ type: 'JQUERY_SUBMIT', data: { formId, requestBody } }, url);

beforeEach(() => {
  useAuthStore.setState({ ...initialAuth, ssoInProgress: true });
});

it('opens the SSO form fresh, filling the credentials and device into its script', async () => {
  await renderScreen();
  expect(mockProps.source.headers).toEqual({ Cookie: '' });
  expect(mockProps.injectedJavaScript).toContain(JSON.stringify('u"1'));
  expect(mockProps.injectedJavaScript).toContain(JSON.stringify('p\\w'));
  expect(mockProps.injectedJavaScript).toContain('"device-fp"');
  // The alert override runs before the page's scripts, without the password.
  expect(mockProps.injectedJavaScriptBeforeContentLoaded).toContain(
    'TRUSTED_BROWSER_LIMIT',
  );
  expect(mockProps.injectedJavaScriptBeforeContentLoaded).not.toContain('p\\w');
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

it('reads messages only from Tsinghua pages over https', async () => {
  await renderScreen();
  const form = {
    fingerPrint: 'fp',
    fingerGenPrint: 'g',
    fingerGenPrint3: 'g3',
  };
  await submit(form, 'theform', 'https://id.tsinghua.edu.cn.evil.example/');
  await submit(form, 'theform', 'http://id.tsinghua.edu.cn/');
  await submit(form, 'theform', 'not a url');
  mockProps.onShouldStartLoadWithRequest({ url: ROAMING });
  expect(login).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(t('ssoFailed'), 'error');
});

it('keeps the page on Tsinghua sites and opens other links outside', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await renderScreen();
  const load = (url: string, isTopFrame?: boolean) =>
    mockProps.onShouldStartLoadWithRequest({ url, isTopFrame });
  expect(load('https://www.tsinghua.edu.cn/')).toBe(true);
  expect(load('about:blank')).toBe(true);
  expect(load('https://cdn.example/frame', false)).toBe(true);
  expect(load('https://example.com/help')).toBe(false);
  expect(openURL).toHaveBeenCalledWith('https://example.com/help');
  // The sites' own http links stay, as before.
  expect(load('http://learn.tsinghua.edu.cn/')).toBe(true);
  expect(load('https://tsinghua.edu.cn.example.com/')).toBe(false);
  expect(load('weixin://dl')).toBe(false);
  expect(openURL).toHaveBeenCalledTimes(2);
  expect(useAuthStore.getState().ssoInProgress).toBe(true);
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

it("shows learnX's own alert for the trusted browser limit, linking to the page that manages them", async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await renderScreen();

  await message({ type: 'TRUSTED_BROWSER_LIMIT' }, 'https://example.com/');
  expect(alert).not.toHaveBeenCalled();

  await message({ type: 'TRUSTED_BROWSER_LIMIT' });
  expect(alert).toHaveBeenCalledWith(
    t('trustedBrowserLimit'),
    t('trustedBrowserLimitNote'),
    [
      { text: t('cancel'), style: 'cancel' },
      expect.objectContaining({ text: t('manageTrustedBrowsers') }),
    ],
  );
  const buttons = alert.mock.calls[0][2]!;
  buttons[1].onPress!();
  expect(openURL).toHaveBeenCalledWith(TRUSTED_BROWSERS_URL);
  expect(navigation.goBack).not.toHaveBeenCalled();
});
