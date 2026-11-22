import { EventEmitter } from 'node:events';
import {
  HTML_LOAD_TIMEOUT_MS,
  createWebviews,
  externalUrl,
  hardenWebview,
  webviewAllowedUrl,
  webviewPermission,
} from '../webviews.ts';

describe('webviewAllowedUrl', () => {
  it.each([
    ['https://id.tsinghua.edu.cn/do/off/ui/auth/login/form/x/0', true],
    ['http://learn.tsinghua.edu.cn/f/x', false],
    ['https://tsinghua.app/courses/1', true],
    ['https://github.com/robertying/learnX/releases', true],
    ['https://github.com/robertying/learnx', true],
    ['https://github.com/someone/else', false],
    ['http://github.com/robertying/learnX/releases', false],
    ['https://eviltsinghua.edu.cn/', false],
    ['https://example.com/', false],
    ['app://learnx/', false],
    ['file:///etc/hosts', false],
    ['not a url', false],
  ])('%s: %s', (url, allowed) => {
    expect(webviewAllowedUrl(url)).toBe(allowed);
  });

  it('hands only web and mail links to the system', () => {
    expect(externalUrl('https://example.com')).toBe(true);
    expect(externalUrl('mailto:a@b.c')).toBe(true);
    expect(externalUrl('file:///etc/hosts')).toBe(false);
    expect(externalUrl('data:text/html,x')).toBe(false);
  });
});

describe('hardenWebview', () => {
  it("gives a web view learnX's preload, the sandbox and isolation", () => {
    const webPreferences: Record<string, unknown> = {
      partition: 'other',
      preload: '/evil.js',
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false,
    };
    const params: Record<string, string> = {
      src: 'about:blank',
      partition: 'persist:learnx',
      allowpopups: 'true',
      preload: 'file:///evil.js',
    };
    expect(
      hardenWebview(webPreferences, params, '/app/webviewPreload.cjs'),
    ).toBe(true);
    expect(webPreferences).toEqual({
      partition: 'persist:learnx',
      preload: '/app/webviewPreload.cjs',
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      javascript: true,
      spellcheck: false,
      backgroundThrottling: true,
    });
    expect(params).toEqual({ src: 'about:blank', partition: 'persist:learnx' });
  });

  it('lets a page turn JavaScript off', () => {
    const webPreferences: Record<string, unknown> = { javascript: false };
    hardenWebview(
      webPreferences,
      { src: 'about:blank', partition: 'persist:learnx' },
      '/p.cjs',
      { backgroundThrottling: false },
    );
    expect(webPreferences.javascript).toBe(false);
    expect(webPreferences.backgroundThrottling).toBe(false);
  });

  it.each([
    [{ src: 'https://example.com', partition: 'persist:learnx' }],
    [{ src: 'about:blank', partition: 'persist:other' }],
    [{ src: 'about:blank', partition: '' }],
  ])('refuses %j', params => {
    expect(hardenWebview({}, params, '/p.cjs')).toBe(false);
  });
});

/** A fake web contents: a web view's guest, or the window that hosts it. */
const fakeContents = (
  id: number,
  type: 'window' | 'webview',
  host?: ReturnType<typeof fakeContents>,
) =>
  Object.assign(new EventEmitter(), {
    id,
    hostWebContents: host,
    destroyed: false,
    sent: [] as unknown[][],
    windowOpenHandler: undefined as
      | ((details: { url: string }) => { action: string })
      | undefined,
    getType: () => type,
    isDestroyed() {
      return this.destroyed;
    },
    send(...args: unknown[]) {
      this.sent.push(args);
    },
    setWindowOpenHandler(
      handler: (details: { url: string }) => {
        action: string;
      },
    ) {
      this.windowOpenHandler = handler;
    },
  });

const setup = (timeoutMs?: number) => {
  const openExternal = jest.fn();
  const webviews = createWebviews({ openExternal, timeoutMs });
  const host = fakeContents(1, 'window');
  const guest = fakeContents(2, 'webview', host);
  return { openExternal, webviews, host, guest };
};

/** Starts a top-level load and returns what it is told, once it is. */
const load = (
  webviews: ReturnType<typeof createWebviews>,
  guest: unknown,
  url: string,
  method = 'GET',
) =>
  new Promise<unknown>(resolve =>
    webviews.onBeforeRequest(
      { resourceType: 'mainFrame', webContents: guest, url, method } as never,
      resolve,
    ),
  );

const lastAsk = (host: ReturnType<typeof fakeContents>) =>
  host.sent.at(-1) as [string, { requestId: number; guestId: number }];

describe('createWebviews', () => {
  it('keeps scripts for the page that shows the web view', () => {
    const { webviews, host, guest } = setup();
    const otherHost = fakeContents(3, 'window');
    expect(webviews.scriptsFor(guest as never)).toEqual({});
    expect(
      webviews.configure(otherHost as never, guest as never, { before: 'x' }),
    ).toBe(false);
    expect(webviews.configure(host as never, undefined, {})).toBe(false);
    expect(
      webviews.configure(host as never, guest as never, {
        before: 'b',
        after: 3 as never,
      }),
    ).toBe(true);
    expect(webviews.scriptsFor(guest as never)).toEqual({ before: 'b' });
    expect(webviews.scriptsFor(host as never)).toEqual({});
    guest.emit('destroyed');
    expect(webviews.scriptsFor(guest as never)).toEqual({});
  });

  it('passes what is not a web view’s top-level load', async () => {
    const { webviews, host, guest } = setup();
    const pass = (details: object) =>
      new Promise(resolve =>
        webviews.onBeforeRequest(details as never, resolve),
      );
    await expect(
      pass({ resourceType: 'subFrame', webContents: guest, url: 'https://x' }),
    ).resolves.toEqual({});
    await expect(
      pass({ resourceType: 'mainFrame', webContents: host, url: 'https://x' }),
    ).resolves.toEqual({});
    await expect(
      pass({ resourceType: 'mainFrame', url: 'https://x' }),
    ).resolves.toEqual({});
    expect(host.sent).toEqual([]);
  });

  it('asks the page about a load and follows its answer', async () => {
    const { webviews, host, guest, openExternal } = setup();
    const allowed = load(
      webviews,
      guest,
      'https://id.tsinghua.edu.cn/do/off/check',
      'POST',
    );
    const [channel, request] = lastAsk(host);
    expect(channel).toBe('webview:ask');
    expect(request).toEqual({
      guestId: 2,
      requestId: expect.any(Number),
      url: 'https://id.tsinghua.edu.cn/do/off/check',
      method: 'POST',
      isTopFrame: true,
    });
    // Only the page that was asked answers.
    webviews.answer(
      fakeContents(9, 'window') as never,
      request.requestId,
      false,
    );
    webviews.answer(host as never, request.requestId, true);
    await expect(allowed).resolves.toEqual({});

    const refused = load(webviews, guest, 'https://learn.tsinghua.edu.cn/f/x');
    webviews.answer(host as never, lastAsk(host)[1].requestId, false);
    await expect(refused).resolves.toEqual({ cancel: true });
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('sends a load over plain http to the allowed sites over https', async () => {
    const { webviews, host, guest } = setup();
    await expect(
      load(webviews, guest, 'http://learn.tsinghua.edu.cn/f/x?a=1', 'POST'),
    ).resolves.toEqual({
      redirectURL: 'https://learn.tsinghua.edu.cn/f/x?a=1',
    });
    expect(host.sent).toEqual([]);
  });

  it('opens an allowed load off the allowed sites in the browser', async () => {
    const { webviews, host, guest, openExternal } = setup();
    const done = load(webviews, guest, 'https://example.com/');
    webviews.answer(host as never, lastAsk(host)[1].requestId, true);
    await expect(done).resolves.toEqual({ cancel: true });
    expect(openExternal).toHaveBeenCalledWith('https://example.com/');

    const posted = load(webviews, guest, 'https://example.com/', 'POST');
    webviews.answer(host as never, lastAsk(host)[1].requestId, true);
    await expect(posted).resolves.toEqual({ cancel: true });
    expect(openExternal).toHaveBeenCalledTimes(1);
  });

  it('refuses a load nobody decides on in time', async () => {
    jest.useFakeTimers();
    const { webviews, guest } = setup(1000);
    const done = load(webviews, guest, 'https://learn.tsinghua.edu.cn/');
    jest.advanceTimersByTime(1000);
    await expect(done).resolves.toEqual({ cancel: true });
  });

  it('refuses a load once the page is gone', async () => {
    const { webviews, host, guest } = setup();
    host.destroyed = true;
    await expect(
      load(webviews, guest, 'https://learn.tsinghua.edu.cn/'),
    ).resolves.toEqual({ cancel: true });
  });

  it('keeps a web view to the web, with new windows in the browser', () => {
    const { webviews, guest, openExternal } = setup();
    webviews.guard(guest as never);
    expect(guest.windowOpenHandler?.({ url: 'https://example.com' })).toEqual({
      action: 'deny',
    });
    expect(guest.windowOpenHandler?.({ url: 'file:///etc' })).toEqual({
      action: 'deny',
    });
    expect(openExternal).toHaveBeenCalledTimes(1);

    const navigate = (url: string) => {
      const event = { preventDefault: jest.fn() };
      guest.emit('will-navigate', event, url);
      return event.preventDefault.mock.calls.length > 0;
    };
    expect(navigate('https://learn.tsinghua.edu.cn/')).toBe(false);
    expect(navigate('about:blank')).toBe(false);
    expect(navigate('app://learnx/')).toBe(true);
    expect(navigate('file:///etc/hosts')).toBe(true);
    expect(navigate('mailto:a@b.c')).toBe(true);
    expect(openExternal).toHaveBeenLastCalledWith('mailto:a@b.c');
  });
});

describe('loadHtml', () => {
  afterEach(() => jest.useRealTimers());

  /** A web view's DevTools protocol, as `webContents.debugger` is. */
  const fakeDebugger = ({ attachFails = false } = {}) =>
    Object.assign(new EventEmitter(), {
      attached: false,
      commands: [] as [string, Record<string, unknown>?][],
      attach() {
        if (attachFails || this.attached) {
          throw new Error('Another debugger is already attached');
        }
        this.attached = true;
      },
      detach() {
        this.attached = false;
      },
      isAttached() {
        return this.attached;
      },
      sendCommand: jest.fn(async function (
        this: { commands: unknown[] },
        method: string,
        params?: Record<string, unknown>,
      ) {
        this.commands.push([method, params]);
        return {};
      }),
    });

  const setupHtml = (options?: { attachFails?: boolean }) => {
    const all = setup();
    const devtools = fakeDebugger(options);
    const loaded: string[] = [];
    Object.assign(all.guest, {
      debugger: devtools,
      loadURL: async (url: string) => {
        loaded.push(url);
      },
    });
    return { ...all, devtools, loaded };
  };

  /** The web view asking for a document, as the Fetch domain reports it. */
  const paused = (
    devtools: ReturnType<typeof fakeDebugger>,
    requestId: string,
    url: string,
    method = 'GET',
  ) =>
    devtools.emit('message', {}, 'Fetch.requestPaused', {
      requestId,
      resourceType: 'Document',
      request: { url, method },
    });

  const flush = () => new Promise(resolve => setImmediate(resolve));

  it('serves the HTML at its base URL, past the size of a data URL', async () => {
    const { webviews, host, guest, devtools, loaded } = setupHtml();
    const html = `<p>${'公告'.repeat(400_000)}</p>`;
    await expect(
      webviews.loadHtml(
        host as never,
        guest as never,
        html,
        'https://learn.tsinghua.edu.cn',
      ),
    ).resolves.toBe(true);
    expect(loaded).toEqual(['https://learn.tsinghua.edu.cn/']);
    // The app's own load: the page isn't asked about it.
    await expect(
      load(webviews, guest, 'https://learn.tsinghua.edu.cn/'),
    ).resolves.toEqual({});
    expect(host.sent).toEqual([]);

    // Another document (a frame) goes on to the network.
    paused(devtools, 'a', 'https://learn.tsinghua.edu.cn/frame');
    paused(devtools, 'b', 'https://learn.tsinghua.edu.cn/');
    await flush();
    expect(devtools.commands).toEqual([
      [
        'Fetch.enable',
        {
          patterns: [
            {
              urlPattern: '*',
              resourceType: 'Document',
              requestStage: 'Request',
            },
          ],
        },
      ],
      ['Fetch.continueRequest', { requestId: 'a' }],
      [
        'Fetch.fulfillRequest',
        {
          requestId: 'b',
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'text/html; charset=utf-8' },
          ],
          body: Buffer.from(html).toString('base64'),
        },
      ],
    ]);
    // Done: nothing of the web view's is intercepted any more.
    expect(devtools.attached).toBe(false);
    expect(devtools.listenerCount('message')).toBe(0);
    const later = load(webviews, guest, 'https://learn.tsinghua.edu.cn/');
    expect(lastAsk(host)[0]).toBe('webview:ask');
    webviews.answer(host as never, lastAsk(host)[1].requestId, false);
    await expect(later).resolves.toEqual({ cancel: true });
  });

  it('ends a web view’s HTML load when another starts there', async () => {
    const { webviews, host, guest, devtools, loaded } = setupHtml();
    const show = (html: string) =>
      webviews.loadHtml(
        host as never,
        guest as never,
        html,
        'https://learn.tsinghua.edu.cn/',
      );
    await expect(show('<p>first</p>')).resolves.toBe(true);
    await expect(show('<p>second</p>')).resolves.toBe(true);
    expect(loaded).toHaveLength(2);
    expect(devtools.listenerCount('message')).toBe(1);
    paused(devtools, 'a', 'https://learn.tsinghua.edu.cn/');
    await flush();
    expect(devtools.commands.at(-1)).toEqual([
      'Fetch.fulfillRequest',
      expect.objectContaining({
        body: Buffer.from('<p>second</p>').toString('base64'),
      }),
    ]);
    expect(devtools.attached).toBe(false);
  });

  it('gives up after a while, or when the web view goes', async () => {
    jest.useFakeTimers();
    const { webviews, host, guest, devtools } = setupHtml();
    await webviews.loadHtml(
      host as never,
      guest as never,
      '<p>x</p>',
      'https://learn.tsinghua.edu.cn/',
    );
    jest.advanceTimersByTime(HTML_LOAD_TIMEOUT_MS);
    expect(devtools.attached).toBe(false);

    await webviews.loadHtml(
      host as never,
      guest as never,
      '<p>x</p>',
      'https://learn.tsinghua.edu.cn/',
    );
    guest.emit('destroyed');
    expect(devtools.attached).toBe(false);
  });

  it.each([
    ['another page’s web view', 'other host', 'https://learn.tsinghua.edu.cn/'],
    ['a base URL off the allowed sites', 'host', 'https://example.com/'],
    ['a base URL that isn’t the web', 'host', 'about:blank'],
  ])('refuses %s', async (_name, which, baseUrl) => {
    const { webviews, host, guest, devtools, loaded } = setupHtml();
    const asker = which === 'host' ? host : fakeContents(3, 'window');
    await expect(
      webviews.loadHtml(asker as never, guest as never, '<p>x</p>', baseUrl),
    ).resolves.toBe(false);
    expect(devtools.attached).toBe(false);
    expect(loaded).toEqual([]);
  });

  it('refuses when a debugger is already attached', async () => {
    const { webviews, host, guest, loaded } = setupHtml({ attachFails: true });
    await expect(
      webviews.loadHtml(
        host as never,
        guest as never,
        '<p>x</p>',
        'https://learn.tsinghua.edu.cn/',
      ),
    ).resolves.toBe(false);
    expect(loaded).toEqual([]);
  });
});

describe('webviewPermission', () => {
  const contents = (type: string, destroyed = false) =>
    ({ getType: () => type, isDestroyed: () => destroyed }) as never;
  const notice = 'https://learn.tsinghua.edu.cn/f/notice';

  it.each(['fullscreen', 'clipboard-sanitized-write'])(
    'lets a web view on an allowed site have %s',
    permission => {
      expect(webviewPermission(contents('webview'), permission, notice)).toBe(
        true,
      );
    },
  );

  it.each([
    ['another permission', contents('webview'), 'media', notice],
    ['notifications', contents('webview'), 'notifications', notice],
    ['another site', contents('webview'), 'fullscreen', 'https://example.com/'],
    ['the app’s window', contents('window'), 'fullscreen', 'app://learnx/'],
    ['a web view gone', contents('webview', true), 'fullscreen', notice],
    ['no page', null, 'fullscreen', notice],
  ])('refuses %s', (_name, from, permission, url) => {
    expect(webviewPermission(from, permission, url)).toBe(false);
  });
});
