import { EventEmitter } from 'node:events';
import {
  TIMEOUT_MS,
  allowedHost,
  allowedUrl,
  httpsUrl,
  mainFetch,
} from '../net.ts';

describe('allowedUrl', () => {
  it.each([
    ['https://learn.tsinghua.edu.cn/f/login', true],
    ['http://id.tsinghua.edu.cn/do/off', false],
    ['https://tsinghua.edu.cn/', true],
    ['https://tsinghua.app/api/learnx/courses', true],
    ['https://eviltsinghua.edu.cn/', false],
    ['https://tsinghua.edu.cn.example.com/', false],
    ['file:///etc/passwd', false],
    ['ftp://learn.tsinghua.edu.cn/', false],
    ['not a url', false],
  ])('%s: %s', (url, allowed) => {
    expect(allowedUrl(url)).toBe(allowed);
  });

  it('moves plain http on the allowed sites to https', () => {
    expect(httpsUrl('http://learn.tsinghua.edu.cn/f/x?a=1#b')).toBe(
      'https://learn.tsinghua.edu.cn/f/x?a=1#b',
    );
    expect(httpsUrl('http://zhjw.cic.tsinghua.edu.cn:80/')).toBe(
      'https://zhjw.cic.tsinghua.edu.cn/',
    );
    expect(httpsUrl('https://learn.tsinghua.edu.cn/')).toBeNull();
    expect(httpsUrl('http://example.com/')).toBeNull();
    expect(httpsUrl('http://tsinghua.edu.cn.example.com/')).toBeNull();
    expect(httpsUrl('not a url')).toBeNull();
  });

  it('matches hosts exactly or as subdomains', () => {
    expect(allowedHost('mirrors.tuna.tsinghua.edu.cn')).toBe(true);
    expect(allowedHost('app.tsinghua.app')).toBe(false);
  });
});

/** A fake `net.request`: the test drives its events. */
const fakeNet = () => {
  const requests: (EventEmitter & {
    options: Record<string, unknown>;
    headers: Record<string, string>;
    written: Buffer[];
    ended: boolean;
    aborted: boolean;
    followed: number;
    setHeader: (name: string, value: string) => void;
    write: (chunk: Buffer) => void;
    end: () => void;
    abort: () => void;
    followRedirect: () => void;
  })[] = [];
  const net = {
    request: (options: Record<string, unknown>) => {
      const request = Object.assign(new EventEmitter(), {
        options,
        headers: {} as Record<string, string>,
        written: [] as Buffer[],
        ended: false,
        aborted: false,
        followed: 0,
        setHeader(name: string, value: string) {
          request.headers[name] = value;
        },
        write(chunk: Buffer) {
          request.written.push(chunk);
        },
        end() {
          request.ended = true;
        },
        abort() {
          request.aborted = true;
        },
        followRedirect() {
          request.followed += 1;
        },
      });
      requests.push(request);
      return request;
    },
  };
  return { net: net as never, requests };
};

const respond = (
  request: EventEmitter,
  status: number,
  headers: Record<string, string | string[]>,
  chunks: string[],
) => {
  const response = Object.assign(new EventEmitter(), {
    statusCode: status,
    statusMessage: 'OK',
    headers,
  });
  request.emit('response', response);
  for (const chunk of chunks) {
    response.emit('data', Buffer.from(chunk));
  }
  response.emit('end');
};

const session = {} as never;

it('sends the request with the session cookies and follows redirects', async () => {
  const { net, requests } = fakeNet();
  const pending = mainFetch(net, session, {
    url: 'https://learn.tsinghua.edu.cn/f/login',
    method: 'POST',
    headers: [['content-type', 'text/plain']],
    body: new TextEncoder().encode('hi').buffer,
  });
  const [request] = requests;
  expect(request.options).toMatchObject({
    method: 'POST',
    session,
    credentials: 'include',
    redirect: 'manual',
  });
  expect(request.headers).toEqual({ 'content-type': 'text/plain' });
  expect(Buffer.concat(request.written).toString()).toBe('hi');
  expect(request.ended).toBe(true);

  request.emit('redirect', 302, 'GET', 'https://learn.tsinghua.edu.cn/f/home');
  expect(request.followed).toBe(1);
  respond(request, 200, { 'set-cookie': ['a=1', 'b=2'], 'x-one': 'v' }, [
    'hel',
    'lo',
  ]);

  const res = await pending;
  expect(res).toMatchObject({
    url: 'https://learn.tsinghua.edu.cn/f/home',
    status: 200,
    statusText: 'OK',
    redirected: true,
    headers: [
      ['set-cookie', 'a=1'],
      ['set-cookie', 'b=2'],
      ['x-one', 'v'],
    ],
  });
  expect(Buffer.from(res.body).toString()).toBe('hello');
});

it('sends no cookies for a request that omits them', async () => {
  const { net, requests } = fakeNet();
  const pending = mainFetch(net, session, {
    url: 'https://tsinghua.app/api/learnx/courses',
    method: 'POST',
    headers: [],
    credentials: 'omit',
  });
  const [request] = requests;
  expect(request.options).toMatchObject({ credentials: 'omit' });
  respond(request, 200, {}, []);
  await pending;
});

it('refuses a URL off the allowed sites', async () => {
  const { net, requests } = fakeNet();
  await expect(
    mainFetch(net, session, {
      url: 'https://example.com/',
      method: 'GET',
      headers: [],
    }),
  ).rejects.toThrow('Not an allowed URL');
  expect(requests).toHaveLength(0);
});

it('refuses a redirect off the allowed sites', async () => {
  const { net, requests } = fakeNet();
  const pending = mainFetch(net, session, {
    url: 'https://learn.tsinghua.edu.cn/',
    method: 'GET',
    headers: [],
  });
  requests[0].emit('redirect', 302, 'GET', 'https://example.com/phish');
  await expect(pending).rejects.toThrow('Redirected off the allowed sites');
  expect(requests[0].aborted).toBe(true);
  expect(requests[0].written).toEqual([]);
});

it('sends plain http on the allowed sites over https', async () => {
  const { net, requests } = fakeNet();
  const pending = mainFetch(net, session, {
    url: 'http://learn.tsinghua.edu.cn/f/login',
    method: 'GET',
    headers: [],
  });
  expect(requests[0].options).toMatchObject({
    url: 'https://learn.tsinghua.edu.cn/f/login',
  });
  respond(requests[0], 200, {}, []);
  await expect(pending).resolves.toMatchObject({
    url: 'https://learn.tsinghua.edu.cn/f/login',
    redirected: false,
  });
});

it('refuses a redirect to plain http', async () => {
  const { net, requests } = fakeNet();
  const pending = mainFetch(net, session, {
    url: 'https://learn.tsinghua.edu.cn/',
    method: 'GET',
    headers: [],
  });
  requests[0].emit('redirect', 302, 'GET', 'http://learn.tsinghua.edu.cn/f');
  await expect(pending).rejects.toThrow('Redirected off the allowed sites');
  expect(requests[0].followed).toBe(0);
});

it('aborts with its signal, and rejects on errors', async () => {
  const { net, requests } = fakeNet();
  const controller = new AbortController();
  const aborted = mainFetch(
    net,
    session,
    { url: 'https://learn.tsinghua.edu.cn/', method: 'GET', headers: [] },
    controller.signal,
  );
  controller.abort();
  await expect(aborted).rejects.toThrow('Aborted');
  expect(requests[0].aborted).toBe(true);

  const failed = mainFetch(net, session, {
    url: 'https://learn.tsinghua.edu.cn/',
    method: 'GET',
    headers: [],
  });
  requests[1].emit('error', new Error('net::ERR_CONNECTION_RESET'));
  await expect(failed).rejects.toThrow('ERR_CONNECTION_RESET');
});

describe('a stalled connection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const get = {
    url: 'https://learn.tsinghua.edu.cn/',
    method: 'GET',
    headers: [],
  };

  it('fails when the server says nothing for a minute', async () => {
    const { net, requests } = fakeNet();
    const pending = mainFetch(net, session, get);
    jest.advanceTimersByTime(TIMEOUT_MS.idle - 1);
    expect(requests[0].aborted).toBe(false);
    jest.advanceTimersByTime(1);
    await expect(pending).rejects.toThrow(
      'Timed out: no answer from learn.tsinghua.edu.cn',
    );
    expect(requests[0].aborted).toBe(true);
  });

  it('waits a minute between pieces of the answer, however long it all takes', async () => {
    const { net, requests } = fakeNet();
    const pending = mainFetch(net, session, get);
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      statusMessage: 'OK',
      headers: {},
    });
    requests[0].emit('response', response);
    for (let piece = 0; piece < 5; piece += 1) {
      jest.advanceTimersByTime(TIMEOUT_MS.idle - 1);
      response.emit('data', Buffer.from('x'));
    }
    response.emit('end');
    await expect(pending).resolves.toMatchObject({ status: 200 });
    // Done: nothing fires later.
    jest.advanceTimersByTime(TIMEOUT_MS.upload);
    expect(requests[0].aborted).toBe(false);
  });

  it('gives an upload longer to send', async () => {
    const { net, requests } = fakeNet();
    const controller = new AbortController();
    const pending = mainFetch(
      net,
      session,
      { ...get, method: 'POST', body: new Uint8Array(8).buffer },
      controller.signal,
    );
    jest.advanceTimersByTime(TIMEOUT_MS.idle);
    expect(requests[0].aborted).toBe(false);
    jest.advanceTimersByTime(TIMEOUT_MS.upload - TIMEOUT_MS.idle);
    await expect(pending).rejects.toThrow('Timed out');
    // Aborting afterwards does nothing more.
    controller.abort();
  });
});
