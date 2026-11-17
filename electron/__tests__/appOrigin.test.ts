import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CONTENT_SECURITY_POLICY,
  createServeApp,
  fromApp,
  webFileOf,
} from '../appOrigin.cjs';

let webDir: string;
let outside: string;

beforeEach(() => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-web-')),
  );
  webDir = path.join(root, 'web');
  outside = path.join(root, 'secret.txt');
  fs.mkdirSync(path.join(webDir, '_expo'), { recursive: true });
  fs.writeFileSync(path.join(webDir, 'index.html'), '<html>');
  fs.writeFileSync(path.join(webDir, '_expo', 'app.js'), 'run()');
  fs.writeFileSync(outside, 'secret');
});

afterEach(() => {
  fs.rmSync(path.dirname(webDir), { recursive: true, force: true });
});

describe('webFileOf', () => {
  it('serves the web build’s files, and index.html for any other path', () => {
    expect(webFileOf(webDir, '/_expo/app.js')).toBe(
      path.join(webDir, '_expo', 'app.js'),
    );
    for (const route of ['/', '/notices/1', '/_expo', '/missing.js']) {
      expect(webFileOf(webDir, route)).toBe(path.join(webDir, 'index.html'));
    }
  });

  it.each([
    '/../secret.txt',
    '/%2e%2e/secret.txt',
    '/_expo/%2e%2e/%2e%2e/secret.txt',
    '/..%2fsecret.txt',
    '/..%5csecret.txt',
    '/%2Fetc%2Fhosts',
    '/C:%5CWindows%5Cwin.ini',
    '/%5c%5cserver%5cshare%5csecret.txt',
    '/%E0%A4%A',
  ])('never leaves the web build for %s', pathname => {
    expect(webFileOf(webDir, pathname)).toBe(path.join(webDir, 'index.html'));
  });
});

describe('createServeApp', () => {
  const fetchFile = jest.fn(
    async (url: string) =>
      new Response(fs.readFileSync(new URL(url)), {
        headers: { 'Content-Type': 'text/javascript' },
      }),
  );

  it('serves the web build with the content security policy', async () => {
    const serve = createServeApp({
      webDir,
      fetchFile,
      servePreview: () => undefined,
    });
    const response = await serve(new Request('app://learnx/_expo/app.js'));
    expect(await response.text()).toBe('run()');
    expect(response.headers.get('Content-Security-Policy')).toBe(
      CONTENT_SECURITY_POLICY,
    );
    expect(response.headers.get('Content-Type')).toBe('text/javascript');
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });

  it('hands app://files/ to the preview, once there is one', async () => {
    const preview = jest.fn(async () => new Response('pdf'));
    let ready = false;
    const serve = createServeApp({
      webDir,
      fetchFile,
      servePreview: () => (ready ? preview : undefined),
    });
    const request = new Request('app://files/cache/a.pdf');
    expect((await serve(request)).status).toBe(404);
    ready = true;
    expect(await (await serve(request)).text()).toBe('pdf');
    expect(preview).toHaveBeenCalledWith(request);
  });

  it('serves nothing on another host', async () => {
    const serve = createServeApp({
      webDir,
      fetchFile,
      servePreview: () => undefined,
    });
    expect((await serve(new Request('app://other/index.html'))).status).toBe(
      404,
    );
    expect(fetchFile).not.toHaveBeenCalled();
  });
});

describe('fromApp', () => {
  const event = (
    type: string,
    frame: { url: string; parent?: object | null } | null,
  ) =>
    ({
      sender: { getType: () => type },
      senderFrame: frame && { parent: null, ...frame },
    }) as never;

  it('lets the window’s page call', () => {
    expect(() =>
      fromApp(event('window', { url: 'app://learnx/notices' })),
    ).not.toThrow();
  });

  it.each([
    ['a web view', event('webview', { url: 'app://learnx/' })],
    [
      'a frame in the page',
      event('window', { url: 'app://learnx/', parent: {} }),
    ],
    ['the file preview', event('window', { url: 'app://files/cache/a.pdf' })],
    [
      'another site',
      event('window', { url: 'https://learn.tsinghua.edu.cn/' }),
    ],
    ['a look-alike', event('window', { url: 'app://learnx.evil/' })],
    ['a frame gone', event('window', null)],
  ])('refuses %s', (_name, from) => {
    expect(() => fromApp(from)).toThrow('IPC from outside the app');
  });
});
