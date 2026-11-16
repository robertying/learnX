import { EventEmitter } from 'node:events';
import {
  createWebviews,
  externalUrl,
  hardenWebview,
  webviewAllowedUrl,
} from '../webviews.cjs';

describe('webviewAllowedUrl', () => {
  it.each([
    ['https://id.tsinghua.edu.cn/do/off/ui/auth/login/form/x/0', true],
    ['http://learn.tsinghua.edu.cn/f/x', true],
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
