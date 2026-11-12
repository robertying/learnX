import { Linking, Platform } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import type { WebViewProps } from 'react-native-webview';
import CookieManager from '@preeternal/react-native-cookie-manager';
import AutoHeightWebView from 'components/AutoHeightWebView';
import { recordError } from 'services/crashReporting';

jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));
// The native web view, as a view that keeps its props.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => <View testID="webview" {...props} />,
  };
});

const learn = 'https://learn.tsinghua.edu.cn';
const webView = () => screen.getByTestId('webview').props as WebViewProps;
const height = () => (webView().style as { height: number }[]).flat()[0].height;

const renderView = async (props: WebViewProps = {}) => {
  await render(<AutoHeightWebView source={{ html: '<p>Hi</p>' }} {...props} />);
  // Lets the cookie copy finish.
  await act(async () => {});
};

it('loads HTML at the Web Learning root, with the session cookies', async () => {
  jest.mocked(CookieManager.get).mockResolvedValueOnce({
    JSESSIONID: { name: 'JSESSIONID', value: 'abc', sameSite: 'none' },
    XSRF: { name: 'XSRF', value: 'x' },
  } as never);
  await renderView();
  expect(webView().source).toEqual({
    baseUrl: learn,
    headers: { Cookie: 'JSESSIONID=abc; XSRF=x' },
    html: '<p>Hi</p>',
  });
  // A cross-site cookie must be secure for the web view to send it.
  expect(CookieManager.set).toHaveBeenCalledWith(
    learn,
    expect.objectContaining({ name: 'JSESSIONID', secure: true }),
    true,
  );
});

it('records a cookie store failure and loads without cookies', async () => {
  jest.mocked(CookieManager.get).mockRejectedValueOnce(new Error('store'));
  await renderView({ source: { uri: `${learn}/page` } });
  expect(recordError).toHaveBeenCalledWith(new Error('store'));
  expect(webView().source).toEqual({
    baseUrl: undefined,
    headers: { Cookie: '' },
    uri: `${learn}/page`,
  });
});

it('grows to the height the page reports', async () => {
  await renderView();
  expect(height()).toBe(0);
  const message = (data: string) =>
    act(() => webView().onMessage!({ nativeEvent: { data } } as never));
  await message('320');
  expect(height()).toBe(320);
  await message('nonsense');
  await message('0');
  expect(height()).toBe(320);
});

it('waits for the session cookies before loading', async () => {
  let resolve!: (cookies: object) => void;
  jest
    .mocked(CookieManager.get)
    .mockReturnValueOnce(new Promise(r => (resolve = r)) as never);
  await render(<AutoHeightWebView source={{ html: '<p>Hi</p>' }} />);
  expect(screen.queryByTestId('webview')).toBeNull();
  await act(async () => resolve({}));
  expect(webView().source).toMatchObject({ headers: { Cookie: '' } });
});

it('is ready once the content has a height, or once loading ends', async () => {
  const onReady = jest.fn();
  const onLoadEnd = jest.fn();
  await renderView({ onReady, onLoadEnd } as WebViewProps);
  expect(onReady).not.toHaveBeenCalled();
  await act(() =>
    webView().onMessage!({ nativeEvent: { data: '0' } } as never),
  );
  expect(onReady).not.toHaveBeenCalled();
  await act(() =>
    webView().onMessage!({ nativeEvent: { data: '120' } } as never),
  );
  expect(onReady).toHaveBeenCalledTimes(1);
  await act(() => webView().onLoadEnd!({} as never));
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(onLoadEnd).toHaveBeenCalled();

  // A page that never reports a height, such as one that failed.
  const failed = jest.fn();
  await renderView({ onReady: failed } as WebViewProps);
  await act(() => webView().onLoadEnd!({} as never));
  expect(failed).toHaveBeenCalledTimes(1);
});

describe('loads', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  const shouldLoad = (request: object) =>
    webView().onShouldStartLoadWithRequest!({
      isTopFrame: true,
      ...request,
    } as never);

  it('keeps its own page on iOS and opens tapped web and mail links outside', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await renderView();
    expect(shouldLoad({ url: 'about:blank', navigationType: 'other' })).toBe(
      true,
    );
    expect(shouldLoad({ url: `${learn}/#top`, navigationType: 'other' })).toBe(
      true,
    );
    expect(
      shouldLoad({ url: 'https://evil.example', navigationType: 'other' }),
    ).toBe(false);
    expect(open).not.toHaveBeenCalled();

    expect(
      shouldLoad({ url: 'https://example.com', navigationType: 'click' }),
    ).toBe(false);
    expect(open).toHaveBeenCalledWith('https://example.com');
    shouldLoad({ url: 'intent://scan', navigationType: 'click' });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('treats every load the page starts on Android as a link', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await renderView();
    expect(shouldLoad({ url: 'mailto:ta@example.com' })).toBe(false);
    expect(open).toHaveBeenCalledWith('mailto:ta@example.com');
  });

  it('leaves frames inside the page alone', async () => {
    await renderView();
    expect(
      shouldLoad({ url: 'https://video.example', isTopFrame: false }),
    ).toBe(true);
  });
});
