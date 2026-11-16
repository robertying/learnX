import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import type { WebviewLoadRequest } from 'web/bridge';
import * as webView from 'web/packages/WebView';
import { installBridge } from 'test-utils/mocks/electronBridge';
import { MockWebview, mockViews } from 'test-utils/mocks/webviewTag';

jest.mock('web/packages/webviewTag', () =>
  require('test-utils/mocks/webviewTag'),
);

// One bridge for the file: the module starts answering the main process's
// questions once, on the bridge it finds then.
const bridge = installBridge();
let asked: ((request: WebviewLoadRequest) => void) | undefined;
bridge.webviews.onAsk = listener => {
  asked = listener;
};

/** The main process asking the page about a load. */
const ask = (request: Partial<WebviewLoadRequest>) => {
  asked?.({
    guestId: 7,
    requestId: 1,
    url: 'https://learn.tsinghua.edu.cn/',
    method: 'GET',
    isTopFrame: true,
    ...request,
  });
  return jest.mocked(bridge.webviews.answer).mock.calls.at(-1);
};

beforeEach(() => {
  mockViews.length = 0;
});

describe('connectWebview', () => {
  const connect = (
    view: MockWebview,
    shouldStart = jest.fn(() => true),
    handleEvent = jest.fn(),
  ) => {
    const onReady = jest.fn();
    const disconnect = webView.connectWebview(view as never, {
      shouldStart,
      handleEvent,
      scripts: () => ({ before: 'b', after: 'a' }),
      onReady,
    });
    return { onReady, disconnect, shouldStart, handleEvent };
  };

  it('sets the web view up once it has attached', async () => {
    const view = new MockWebview();
    const { onReady } = connect(view);
    expect(bridge.webviews.configure).not.toHaveBeenCalled();
    view.attach(7);
    view.attach(7);
    await Promise.resolve();
    expect(bridge.webviews.configure).toHaveBeenCalledTimes(1);
    expect(bridge.webviews.configure).toHaveBeenCalledWith(7, {
      before: 'b',
      after: 'a',
    });
    expect(onReady).toHaveBeenCalledWith(7);
  });

  it('sets up a web view that has already attached', async () => {
    const view = new MockWebview();
    view.id = 3;
    const { onReady } = connect(view);
    await Promise.resolve();
    expect(onReady).toHaveBeenCalledWith(3);
  });

  it('answers loads for its own web view only', () => {
    const view = new MockWebview();
    const { shouldStart } = connect(
      view,
      jest.fn(() => false),
    );
    view.attach(7);
    expect(ask({ requestId: 4 })).toEqual([4, false]);
    expect(shouldStart).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://learn.tsinghua.edu.cn/' }),
    );
    expect(ask({ guestId: 99, requestId: 5 })).toEqual([5, false]);
  });

  it('refuses loads whose decision throws', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const view = new MockWebview();
    connect(
      view,
      jest.fn(() => {
        throw new Error('boom');
      }),
    );
    view.attach(7);
    expect(ask({ requestId: 6 })).toEqual([6, false]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('passes events on until disconnected', async () => {
    const view = new MockWebview();
    const { handleEvent, disconnect, onReady } = connect(view);
    view.emit('did-stop-loading');
    expect(handleEvent).toHaveBeenCalledTimes(1);
    view.attach(7);
    disconnect();
    await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
    view.emit('did-stop-loading');
    expect(handleEvent).toHaveBeenCalledTimes(1);
    expect(ask({ requestId: 8 })).toEqual([8, false]);
  });
});

describe('handleWebviewEvent', () => {
  const props = () => ({
    onMessage: jest.fn(),
    onLoadStart: jest.fn(),
    onLoad: jest.fn(),
    onLoadEnd: jest.fn(),
    onLoadProgress: jest.fn(),
    onError: jest.fn(),
    onNavigationStateChange: jest.fn(),
  });
  const shown = () => {
    const view = new MockWebview();
    view.id = 1;
    view.url = 'https://id.tsinghua.edu.cn/';
    return view;
  };
  const event = (type: string, fields: object = {}) =>
    Object.assign(new Event(type), fields);

  it('reports loads with what the web view shows', () => {
    const view = shown();
    const p = props();
    webView.handleWebviewEvent(event('did-start-loading'), view, p);
    webView.handleWebviewEvent(event('did-finish-load'), view, p);
    webView.handleWebviewEvent(event('did-stop-loading'), view, p);
    webView.handleWebviewEvent(event('did-navigate-in-page'), view, p);
    const state = {
      url: 'https://id.tsinghua.edu.cn/',
      title: 'Title',
      loading: false,
      canGoBack: true,
      canGoForward: false,
      lockIdentifier: 0,
      navigationType: 'other',
      mainDocumentURL: 'https://id.tsinghua.edu.cn/',
    };
    expect(p.onLoadStart).toHaveBeenCalledWith({ nativeEvent: state });
    expect(p.onLoad).toHaveBeenCalledWith({ nativeEvent: state });
    expect(p.onLoadEnd).toHaveBeenCalledWith({ nativeEvent: state });
    expect(
      p.onLoadProgress.mock.calls.map(c => c[0].nativeEvent.progress),
    ).toEqual([0.1, 1]);
    expect(p.onNavigationStateChange).toHaveBeenCalledTimes(2);
    expect(p.onNavigationStateChange).toHaveBeenCalledWith(state);
  });

  it('leaves out the blank page it starts on', () => {
    const p = props();
    const view = new MockWebview();
    webView.handleWebviewEvent(event('did-start-loading'), view, p);
    view.id = 1;
    webView.handleWebviewEvent(event('did-stop-loading'), view, p);
    webView.handleWebviewEvent(event('did-start-loading'), null, p);
    expect(p.onLoadStart).not.toHaveBeenCalled();
    expect(p.onLoadEnd).not.toHaveBeenCalled();
  });

  it("passes the page's messages", () => {
    const p = props();
    const view = shown();
    webView.handleWebviewEvent(
      event('ipc-message', { channel: 'message', args: ['{"type":"x"}'] }),
      view,
      p,
    );
    webView.handleWebviewEvent(
      event('ipc-message', { channel: 'other', args: ['y'] }),
      view,
      p,
    );
    expect(p.onMessage).toHaveBeenCalledTimes(1);
    expect(p.onMessage.mock.calls[0][0].nativeEvent).toMatchObject({
      data: '{"type":"x"}',
      url: 'https://id.tsinghua.edu.cn/',
    });
  });

  it('reports failed loads, not cancelled ones', () => {
    const p = props();
    const view = shown();
    const failed = (fields: object) =>
      webView.handleWebviewEvent(event('did-fail-load', fields), view, p);
    failed({ errorCode: -3, isMainFrame: true });
    failed({ errorCode: -105, isMainFrame: false });
    failed({
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      validatedURL: 'https://x.tsinghua.edu.cn/',
      isMainFrame: true,
    });
    expect(p.onError).toHaveBeenCalledTimes(1);
    expect(p.onError.mock.calls[0][0].nativeEvent).toMatchObject({
      url: 'https://x.tsinghua.edu.cn/',
      code: -105,
      description: 'ERR_NAME_NOT_RESOLVED',
    });
  });
});

describe('loadSource', () => {
  it('loads HTML at its base URL', () => {
    const view = new MockWebview();
    webView.loadSource(view as never, {
      html: '<p>a b</p>',
      baseUrl: 'https://learn.tsinghua.edu.cn',
    });
    webView.loadSource(view as never, { html: '' });
    expect(view.loads).toEqual([
      [
        'data:text/html;charset=utf-8,%3Cp%3Ea%20b%3C%2Fp%3E',
        { baseURLForDataURL: 'https://learn.tsinghua.edu.cn' },
      ],
      ['data:text/html;charset=utf-8,', { baseURLForDataURL: 'about:blank' }],
    ]);
  });

  it('loads web URIs with their headers, the cookies left to the session', () => {
    const view = new MockWebview();
    webView.loadSource(view as never, {
      uri: 'https://id.tsinghua.edu.cn/',
      headers: { Cookie: '', 'Accept-Language': 'zh' },
    });
    webView.loadSource(view as never, { uri: 'https://tsinghua.app/' });
    webView.loadSource(view as never, { uri: 'file:///downloads/a.pdf' });
    webView.loadSource(view as never, undefined);
    expect(view.loads).toEqual([
      [
        'https://id.tsinghua.edu.cn/',
        { extraHeaders: 'Accept-Language: zh\n' },
      ],
      ['https://tsinghua.app/', undefined],
    ]);
  });

  it('survives a refused load', async () => {
    const view = new MockWebview();
    view.loadURL.mockRejectedValue(new Error('ERR_ABORTED'));
    webView.loadSource(view as never, { uri: 'https://x.tsinghua.edu.cn/' });
    webView.loadSource(view as never, { html: 'x' });
    await Promise.resolve();
    expect(view.loadURL).toHaveBeenCalledTimes(2);
  });
});

it.each([
  ['https://learn.tsinghua.edu.cn/', ['https://'], true],
  ['http://learn.tsinghua.edu.cn/', ['https://'], false],
  ['https://a.b/', ['*'], true],
  ['https://tsinghua.app/x', ['https://tsinghua.app'], true],
  ['https://tsinghuaXapp/x', ['https://tsinghua.app'], false],
  ['https://a.b/', ['http://*', 'https://*'], true],
])('matchesOriginWhitelist(%s, %j) is %s', (url, whitelist, matches) => {
  expect(webView.matchesOriginWhitelist(url, whitelist)).toBe(matches);
});

describe('WebView', () => {
  const WebView = webView.default;

  /** Renders it, then attaches its element as web contents 7. */
  const renderAttached = async (element: React.ReactElement) => {
    await render(element);
    const view = mockViews.at(-1)!;
    view.url = 'https://id.tsinghua.edu.cn/';
    await act(async () => view.attach(7));
    return view;
  };

  it('shows a web view on the shared session', async () => {
    await render(
      <WebView
        source={{ html: '' }}
        javaScriptEnabled={false}
        style={{ backgroundColor: 'white' }}
      />,
    );
    expect(screen.getByTestId('webview').props).toMatchObject({
      src: 'about:blank',
      partition: 'persist:learnx',
      webpreferences: 'javascript=no',
      tagStyle: expect.objectContaining({
        position: 'absolute',
        backgroundColor: 'white',
      }),
    });
    expect(mockViews[0].loadURL).not.toHaveBeenCalled();
  });

  it('loads the source with its scripts once attached', async () => {
    const view = await renderAttached(
      <WebView
        source={{ html: '<p>x</p>', baseUrl: 'https://learn.tsinghua.edu.cn' }}
        injectedJavaScriptBeforeContentLoaded="before()"
        injectedJavaScript="after()"
      />,
    );
    expect(bridge.webviews.configure).toHaveBeenCalledWith(7, {
      before: 'before()',
      after: 'after()',
    });
    expect(view.loads).toEqual([
      [
        'data:text/html;charset=utf-8,%3Cp%3Ex%3C%2Fp%3E',
        { baseURLForDataURL: 'https://learn.tsinghua.edu.cn' },
      ],
    ]);
  });

  it('applies new scripts and sources', async () => {
    const element = (uri: string, after: string) => (
      <WebView source={{ uri }} injectedJavaScript={after} />
    );
    const view = await renderAttached(element('https://tsinghua.app/', 'a()'));
    await screen.rerender(element('https://tsinghua.app/courses', 'b()'));
    expect(bridge.webviews.configure).toHaveBeenLastCalledWith(7, {
      before: undefined,
      after: 'b()',
    });
    expect(view.loads.map(([url]) => url)).toEqual([
      'https://tsinghua.app/',
      'https://tsinghua.app/courses',
    ]);
  });

  it('decides loads by its whitelist and onShouldStartLoadWithRequest', async () => {
    const onShouldStartLoadWithRequest = jest.fn(
      ({ url }: { url: string }) => !url.includes('roaming'),
    );
    await renderAttached(
      <WebView
        source={{ uri: 'https://id.tsinghua.edu.cn/' }}
        originWhitelist={['https://']}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      />,
    );
    expect(ask({ requestId: 1, url: 'https://id.tsinghua.edu.cn/a' })).toEqual([
      1,
      true,
    ]);
    expect(onShouldStartLoadWithRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://id.tsinghua.edu.cn/a',
        isTopFrame: true,
        canGoBack: true,
      }),
    );
    expect(
      ask({ requestId: 2, url: 'https://learn.tsinghua.edu.cn/roaming' }),
    ).toEqual([2, false]);
    expect(ask({ requestId: 3, url: 'http://id.tsinghua.edu.cn/' })).toEqual([
      3,
      false,
    ]);
    expect(onShouldStartLoadWithRequest).toHaveBeenCalledTimes(2);
  });

  it('allows any load in its whitelist without a handler', async () => {
    await renderAttached(<WebView source={{ uri: 'https://tsinghua.app/' }} />);
    expect(ask({ requestId: 4 })).toEqual([4, true]);
  });

  it('passes messages and load events to its props', async () => {
    const onMessage = jest.fn();
    const onLoadEnd = jest.fn();
    const view = await renderAttached(
      <WebView
        source={{ uri: 'https://id.tsinghua.edu.cn/' }}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
      />,
    );
    await act(async () => {
      view.emit('ipc-message', { channel: 'message', args: ['hi'] });
      view.emit('did-stop-loading');
    });
    expect(onMessage.mock.calls[0][0].nativeEvent).toMatchObject({
      data: 'hi',
      url: 'https://id.tsinghua.edu.cn/',
    });
    expect(onLoadEnd).toHaveBeenCalledTimes(1);
  });

  it('acts through its ref', async () => {
    const ref = createRef<import('web/packages/WebView').WebViewHandle>();
    const view = await renderAttached(
      <WebView ref={ref} source={{ uri: 'https://tsinghua.app/' }} />,
    );
    ref.current?.goBack();
    ref.current?.goForward();
    ref.current?.reload();
    ref.current?.stopLoading();
    ref.current?.requestFocus();
    ref.current?.injectJavaScript('x()');
    expect(view.goBack).toHaveBeenCalled();
    expect(view.goForward).toHaveBeenCalled();
    expect(view.reload).toHaveBeenCalled();
    expect(view.stop).toHaveBeenCalled();
    expect(view.focus).toHaveBeenCalled();
    expect(view.executeJavaScript).toHaveBeenCalledWith('x()');
  });

  it('stops answering for itself once gone', async () => {
    await renderAttached(<WebView source={{ uri: 'https://tsinghua.app/' }} />);
    await screen.unmount();
    expect(ask({ requestId: 9 })).toEqual([9, false]);
  });
});
