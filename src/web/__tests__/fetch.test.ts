import { electronFetch, installElectronFetch } from 'web/fetch';
import type { Bridge, BridgeResponse } from 'web/bridge';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

const response = (overrides: Partial<BridgeResponse> = {}): BridgeResponse => ({
  url: 'https://learn.tsinghua.edu.cn/f/home',
  status: 200,
  statusText: 'OK',
  redirected: true,
  headers: [['content-type', 'text/html']],
  body: new TextEncoder().encode('hello').buffer,
  ...overrides,
});

let bridge: Bridge;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  bridge = installBridge();
  jest.mocked(bridge.fetch).mockResolvedValue(response());
});

afterEach(() => {
  uninstallBridge();
  globalThis.fetch = originalFetch;
});

describe('electronFetch', () => {
  it('sends a GET through the bridge without a body', async () => {
    const res = await electronFetch('https://learn.tsinghua.edu.cn/f/login', {
      headers: { Cookie: 'a=1' },
    });
    expect(bridge.fetch).toHaveBeenCalledWith(expect.any(Number), {
      url: 'https://learn.tsinghua.edu.cn/f/login',
      method: 'GET',
      headers: [['cookie', 'a=1']],
      body: undefined,
    });
    expect(res.status).toBe(200);
    expect(res.url).toBe('https://learn.tsinghua.edu.cn/f/home');
    expect(res.redirected).toBe(true);
    expect(res.headers.get('content-type')).toBe('text/html');
    expect(await res.text()).toBe('hello');
  });

  it('sends a form body as bytes with its content type', async () => {
    await electronFetch(
      'https://id.tsinghua.edu.cn/do/off/ui/auth/login/check',
      {
        method: 'POST',
        body: new URLSearchParams({ i_user: 'a', i_pass: 'b' }),
      },
    );
    const [, req] = jest.mocked(bridge.fetch).mock.calls[0];
    expect(req.method).toBe('POST');
    expect(new TextDecoder().decode(req.body)).toBe('i_user=a&i_pass=b');
    expect(new Headers(req.headers).get('content-type')).toMatch(
      /^application\/x-www-form-urlencoded/,
    );
  });

  it('keeps a content type the caller set', async () => {
    await electronFetch('https://learn.tsinghua.edu.cn/x', {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
    });
    const [, req] = jest.mocked(bridge.fetch).mock.calls[0];
    expect(new Headers(req.headers).get('content-type')).toBe(
      'application/json',
    );
  });

  it('takes the headers of a Request given as input', async () => {
    await electronFetch(
      new Request('https://learn.tsinghua.edu.cn/x', {
        headers: { Accept: 'text/html' },
      }),
    );
    const [, req] = jest.mocked(bridge.fetch).mock.calls[0];
    expect(new Headers(req.headers).get('accept')).toBe('text/html');
  });

  it('gives a response without a body for 204', async () => {
    jest
      .mocked(bridge.fetch)
      .mockResolvedValue(response({ status: 204, statusText: 'No Content' }));
    const res = await electronFetch('https://learn.tsinghua.edu.cn/x');
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  });

  it('rejects as a network failure when the main process fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.mocked(bridge.fetch).mockRejectedValue(new Error('net::ERR_FAILED'));
    await expect(
      electronFetch('https://learn.tsinghua.edu.cn/x'),
    ).rejects.toThrow(new TypeError('Network request failed'));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('net::ERR_FAILED'),
    );
  });

  it('rejects at once for a signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      electronFetch('https://learn.tsinghua.edu.cn/x', {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(bridge.fetch).not.toHaveBeenCalled();
  });

  it('aborts the request in the main process', async () => {
    jest.mocked(bridge.fetch).mockReturnValue(new Promise(() => {}));
    const controller = new AbortController();
    const pending = electronFetch('https://learn.tsinghua.edu.cn/x', {
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const [id] = jest.mocked(bridge.fetch).mock.calls[0];
    expect(bridge.abortFetch).toHaveBeenCalledWith(id);
  });

  it('resolves when a signal is never aborted', async () => {
    const res = await electronFetch('https://learn.tsinghua.edu.cn/x', {
      signal: new AbortController().signal,
    });
    expect(res.status).toBe(200);
  });

  it('gives each request its own id', async () => {
    await electronFetch('https://learn.tsinghua.edu.cn/a');
    await electronFetch('https://learn.tsinghua.edu.cn/b');
    const [[first], [second]] = jest.mocked(bridge.fetch).mock.calls;
    expect(second).toBeGreaterThan(first);
  });
});

describe('installElectronFetch', () => {
  it('sends http(s) through the main process and the rest to the browser', async () => {
    const browserFetch = jest.fn(async () => new Response('local'));
    globalThis.fetch = browserFetch;
    installElectronFetch();

    await fetch('https://learn.tsinghua.edu.cn/x');
    await fetch(new URL('http://learn.tsinghua.edu.cn/y'));
    await fetch(new Request('https://tsinghua.app/api/learnx/courses'));
    expect(bridge.fetch).toHaveBeenCalledTimes(3);

    await fetch('app://learnx/assets/font.ttf');
    expect(browserFetch).toHaveBeenCalledWith(
      'app://learnx/assets/font.ttf',
      undefined,
    );
    expect(bridge.fetch).toHaveBeenCalledTimes(3);
  });
});
