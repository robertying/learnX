import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';
import type { Bridge, FileOps } from 'web/bridge';

import {
  FILE_OPERATIONS,
  GRANT_IDLE_MS,
  createFiles,
  runFileOperation,
} from '../files.cjs';

let root: string;
let bridge: Bridge;
let fileSystem: typeof import('web/packages/fileSystem');

// expo-file-system's stand-in in the page (src/web/packages/fileSystem.ts)
// over the main process's real file operations (files.cjs), in a temporary
// folder.
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-files-'));
  const files: FileOps = createFiles({
    cache: path.join(root, 'Caches'),
    document: path.join(root, 'Documents'),
  });
  bridge = installBridge();
  jest.mocked(bridge.files.sync).mockImplementation(((
    op: keyof FileOps,
    ...args: unknown[]
  ) => {
    try {
      return { result: (files[op] as (...a: unknown[]) => unknown)(...args) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }) as never);
  jest.isolateModules(() => {
    fileSystem = require('web/packages/fileSystem');
  });
});

afterEach(() => {
  uninstallBridge();
  fs.rmSync(root, { recursive: true, force: true });
});

it('keeps files in the app folders', () => {
  const { Directory, File, Paths } = fileSystem;
  expect(Paths.cache.uri).toBe(`file://${path.join(root, 'Caches')}/`);
  expect(Paths.document.uri).toBe(`file://${path.join(root, 'Documents')}/`);

  const dir = new Directory(Paths.cache, 'downloads/course 1');
  expect(dir.exists).toBe(false);
  dir.create({ intermediates: true, idempotent: true });
  dir.create({ intermediates: true, idempotent: true });
  expect(dir.exists).toBe(true);
  expect(dir.name).toBe('course 1');

  const file = new File(dir, 'Notes #1 100%.pdf');
  expect(file.uri).toBe(`${dir.uri}/Notes%20%231%20100%25.pdf`);
  expect(file.name).toBe('Notes #1 100%.pdf');
  file.writeSync('hello');
  expect(file.exists).toBe(true);
  expect(file.size).toBe(5);
  expect(file.textSync()).toBe('hello');
  expect(
    fs.readFileSync(
      path.join(root, 'Caches/downloads/course 1/Notes #1 100%.pdf'),
      'utf8',
    ),
  ).toBe('hello');
  expect(file.parentDirectory.name).toBe('course 1');

  const listed = new Directory(Paths.cache, 'downloads').list();
  expect(listed).toHaveLength(1);
  expect(listed[0]).toBeInstanceOf(Directory);
  expect((listed[0] as InstanceType<typeof Directory>).list()[0]?.name).toBe(
    'Notes #1 100%.pdf',
  );
  expect(new Directory(Paths.cache, 'downloads').size).toBe(5);
  expect(dir.info()).toEqual({
    exists: true,
    isDirectory: true,
    size: 5,
    uri: dir.uri,
  });
});

it('moves, copies and deletes', async () => {
  const { Directory, File, Paths } = fileSystem;
  const partial = new File(Paths.cache, 'partial');
  partial.write('new');
  const target = new File(Paths.cache, 'a', 'b.txt');
  target.parentDirectory.create({ intermediates: true });
  target.write('old');

  expect(() => partial.moveSync(target)).toThrow('Already exists');
  partial.moveSync(target, { overwrite: true });
  expect(partial.uri).toBe(target.uri);
  expect(await target.text()).toBe('new');

  const copies = new Directory(Paths.document, 'copies');
  copies.create();
  target.copy(copies);
  expect(new File(copies, 'b.txt').textSync()).toBe('new');
  expect(Array.from(await new File(copies, 'b.txt').bytes())).toEqual([
    110, 101, 119,
  ]);

  expect(copies.createDirectory('x').exists).toBe(true);
  expect(copies.createFile('y.txt').size).toBe(0);
  expect(() => new File(copies, 'y.txt').create()).toThrow('Already exists');
  new File(copies, 'deep/z.txt').create({ intermediates: true });
  expect(new File(copies, 'deep/z.txt').exists).toBe(true);
  expect(() => target.copy(copies)).toThrow('already exists');
  target.copy(copies, { overwrite: true });
  copies.delete();
  expect(copies.exists).toBe(false);
});

it('refuses paths outside the app folders', () => {
  const { Directory, File, Paths } = fileSystem;
  expect(() => new File(Paths.cache, '../escape.txt').write('x')).toThrow(
    'Outside the app folders',
  );
  expect(() => new File('file:///etc/hosts').textSync()).toThrow(
    'Outside the app folders',
  );
  expect(() => new File('https://example.com/a').textSync()).toThrow(
    'Not a file URI',
  );
  expect(() => Paths.cache.delete()).toThrow('The app folders themselves stay');
  expect(() => new Directory(Paths.cache, 'x').create()).not.toThrow();
  expect(() => new Directory(Paths.cache, 'x').create()).toThrow(
    'Already exists',
  );
});

it('picks a folder in the system dialog, and opens no file handles', async () => {
  const { Directory, File, Paths } = fileSystem;
  expect(() => new File(Paths.cache, 'a').open()).toThrow('Not available');

  // A folder the main process granted (fileShell.cjs) can be written in.
  const picked = path.join(root, 'Picked');
  fs.mkdirSync(picked);
  const files = createFiles({
    cache: path.join(root, 'Caches'),
    document: path.join(root, 'Documents'),
  });
  const uri = files.grant(picked);
  jest.mocked(bridge.shell.pickDirectory).mockResolvedValueOnce(uri);
  const dir = await Directory.pickDirectoryAsync();
  expect(dir.uri).toBe(uri);

  jest.mocked(bridge.shell.pickDirectory).mockResolvedValueOnce(null);
  await expect(Directory.pickDirectoryAsync()).rejects.toThrow(/cancel/);
});

describe('DownloadTask', () => {
  it('downloads in the main process, reporting progress', async () => {
    const { DownloadTask, File, Paths } = fileSystem;
    const file = new File(Paths.cache, 'file.pdf');
    let report: (id: number, written: number, total: number) => void = () => {};
    jest.mocked(bridge.files.onProgress).mockImplementation(listener => {
      report = listener;
    });
    jest.mocked(bridge.files.download).mockImplementation(async id => {
      report(id, 50, 100);
      report(id + 1000, 1, 1);
      return { status: 200 };
    });
    const onProgress = jest.fn();
    const task = new DownloadTask('https://learn.tsinghua.edu.cn/f', file, {
      headers: { Referer: 'x' },
      onProgress,
    });
    await expect(task.downloadAsync()).resolves.toBe(file);
    task.release();
    expect(bridge.files.download).toHaveBeenCalledWith(expect.any(Number), {
      url: 'https://learn.tsinghua.edu.cn/f',
      uri: file.uri,
      headers: { Referer: 'x' },
    });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith({
      bytesWritten: 50,
      totalBytes: 100,
    });
  });

  it("rejects with the main process's message", async () => {
    const { DownloadTask, File, Paths } = fileSystem;
    jest
      .mocked(bridge.files.download)
      .mockRejectedValue(
        new Error(
          "Error invoking remote method 'files:download': Error: Unable to download a file: server returned HTTP 403",
        ),
      );
    await expect(
      new DownloadTask('https://x', new File(Paths.cache, 'f')).downloadAsync(),
    ).rejects.toThrow(/^Unable to download a file: server returned HTTP 403$/);
  });

  it('aborts with its signal', async () => {
    const { DownloadTask, File, Paths } = fileSystem;
    const controller = new AbortController();
    jest.mocked(bridge.files.download).mockImplementation(
      () =>
        new Promise((_, reject) => {
          jest
            .mocked(bridge.files.abortDownload)
            .mockImplementation(() => reject(new Error('Aborted')));
        }),
    );
    const task = new DownloadTask('https://x', new File(Paths.cache, 'f'), {
      signal: controller.signal,
    });
    const done = task.downloadAsync();
    controller.abort();
    await expect(done).rejects.toThrow('Aborted');

    const aborted = new AbortController();
    aborted.abort();
    await expect(
      new DownloadTask('https://x', new File(Paths.cache, 'f'), {
        signal: aborted.signal,
      }).downloadAsync(),
    ).rejects.toThrow('Aborted');
  });
});

describe('download in the main process', () => {
  /** A fake `net.request` whose events the test drives. */
  const fakeNet = () => {
    const requests: (EventEmitter & {
      options: Record<string, unknown>;
      headers: Record<string, string>;
      followed: number;
      aborted: boolean;
    })[] = [];
    const net = {
      request: (options: Record<string, unknown>) => {
        const request = Object.assign(new EventEmitter(), {
          options,
          headers: {} as Record<string, string>,
          followed: 0,
          aborted: false,
          setHeader: (name: string, value: string) => {
            request.headers[name] = value;
          },
          end: () => {},
          abort: () => {
            request.aborted = true;
          },
          followRedirect: () => {
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
    chunks: string[],
    headers: Record<string, string> = {},
  ) => {
    const response = Object.assign(new EventEmitter(), {
      statusCode: status,
      headers,
    });
    request.emit('response', response);
    for (const chunk of chunks) {
      response.emit('data', Buffer.from(chunk));
    }
    response.emit('end');
  };

  const session = {} as never;
  let files: ReturnType<typeof createFiles>;
  let target: string;

  beforeEach(() => {
    files = createFiles({
      cache: path.join(root, 'Caches'),
      document: path.join(root, 'Documents'),
    });
    target = `${files.roots().cache}file.pdf`;
  });

  it('saves the file with the session cookies, reporting progress', async () => {
    const { net, requests } = fakeNet();
    const onProgress = jest.fn();
    const done = files.download(
      net,
      session,
      {
        url: 'https://learn.tsinghua.edu.cn/b/download',
        uri: target,
        headers: { Referer: 'https://learn.tsinghua.edu.cn/' },
      },
      { onProgress },
    );
    const [request] = requests;
    expect(request.options).toMatchObject({
      session,
      credentials: 'include',
      redirect: 'manual',
    });
    expect(request.headers).toEqual({
      Referer: 'https://learn.tsinghua.edu.cn/',
    });
    request.emit('redirect', 302, 'GET', 'https://learn.tsinghua.edu.cn/f/x');
    expect(request.followed).toBe(1);
    respond(request, 200, ['%PDF', '-1.7'], { 'content-length': '8' });
    await expect(done).resolves.toEqual({ status: 200 });
    expect(fs.readFileSync(path.join(root, 'Caches/file.pdf'), 'utf8')).toBe(
      '%PDF-1.7',
    );
    expect(onProgress.mock.calls).toEqual([
      [4, 8],
      [8, 8],
    ]);
  });

  it('marks a download as from the internet on Windows', async () => {
    const windows = createFiles(
      {
        cache: path.join(root, 'Caches'),
        document: path.join(root, 'Documents'),
      },
      { platform: 'win32' },
    );
    const { net, requests } = fakeNet();
    const controller = new AbortController();
    const done = windows.download(
      net,
      session,
      { url: 'https://learn.tsinghua.edu.cn/b/download?id=1', uri: target },
      { signal: controller.signal },
    );
    requests[0].emit(
      'redirect',
      302,
      'GET',
      'https://learn.tsinghua.edu.cn/f/x',
    );
    respond(requests[0], 200, ['MZ']);
    await expect(done).resolves.toEqual({ status: 200 });
    // On a Mac the stream is a file with a colon in its name.
    expect(
      fs.readFileSync(
        path.join(root, 'Caches/file.pdf:Zone.Identifier'),
        'utf8',
      ),
    ).toBe(
      '[ZoneTransfer]\r\nZoneId=3\r\nHostUrl=https://learn.tsinghua.edu.cn/\r\n',
    );
    // Aborting after it finished does nothing.
    controller.abort();
    expect(fs.existsSync(path.join(root, 'Caches/file.pdf'))).toBe(true);
  });

  it('marks nothing elsewhere', async () => {
    const { net, requests } = fakeNet();
    const done = files.download(net, session, {
      url: 'https://learn.tsinghua.edu.cn/b/download',
      uri: target,
    });
    respond(requests[0], 200, ['x']);
    await done;
    expect(fs.readdirSync(path.join(root, 'Caches'))).toEqual(['file.pdf']);
  });

  it("downloads the mock account's files", async () => {
    const { net, requests } = fakeNet();
    const done = files.download(net, session, {
      url: 'https://raw.githubusercontent.com/robertying/learnX/main/mock-files/a.pdf',
      uri: target,
    });
    respond(requests[0], 200, ['x']);
    await expect(done).resolves.toEqual({ status: 200 });
  });

  it('fails on a status other than 2xx, leaving no file', async () => {
    const { net, requests } = fakeNet();
    const done = files.download(net, session, {
      url: 'https://learn.tsinghua.edu.cn/b/download',
      uri: target,
    });
    respond(requests[0], 403, ['denied']);
    await expect(done).rejects.toThrow(
      'Unable to download a file: server returned HTTP 403',
    );
    expect(requests[0].aborted).toBe(true);
    expect(fs.existsSync(path.join(root, 'Caches/file.pdf'))).toBe(false);
  });

  it('refuses other sites, and redirects to them', async () => {
    const { net, requests } = fakeNet();
    await expect(
      files.download(net, session, {
        url: 'https://example.com/a',
        uri: target,
      }),
    ).rejects.toThrow('Not an allowed URL');
    expect(requests).toHaveLength(0);

    const done = files.download(net, session, {
      url: 'https://learn.tsinghua.edu.cn/b/download',
      uri: target,
    });
    requests[0].emit('redirect', 302, 'GET', 'https://example.com/a');
    await expect(done).rejects.toThrow('Redirected off the allowed sites');
    expect(requests[0].aborted).toBe(true);
  });

  it('refuses a target outside the app folders', async () => {
    const { net, requests } = fakeNet();
    await expect(
      files.download(net, session, {
        url: 'https://learn.tsinghua.edu.cn/b/download',
        uri: 'file:///tmp/evil.pdf',
      }),
    ).rejects.toThrow('Outside the app folders');
    expect(requests).toHaveLength(0);
  });

  it('stops when aborted', async () => {
    const { net, requests } = fakeNet();
    const controller = new AbortController();
    const done = files.download(
      net,
      session,
      { url: 'https://learn.tsinghua.edu.cn/b/download', uri: target },
      { signal: controller.signal },
    );
    controller.abort();
    await expect(done).rejects.toThrow('Aborted');
    expect(requests[0].aborted).toBe(true);
    // A late response writes nothing.
    respond(requests[0], 200, ['late']);
    expect(fs.existsSync(path.join(root, 'Caches/file.pdf'))).toBe(false);
  });

  it('reports a failed request', async () => {
    const { net, requests } = fakeNet();
    const done = files.download(net, session, {
      url: 'https://learn.tsinghua.edu.cn/b/download',
      uri: target,
    });
    requests[0].emit('error', new Error('net::ERR_CONNECTION_RESET'));
    await expect(done).rejects.toThrow('ERR_CONNECTION_RESET');
  });
});

it('appends bytes to a file in pieces, and only bytes', () => {
  const files = createFiles({
    cache: path.join(root, 'Caches'),
    document: path.join(root, 'Documents'),
  });
  const uri = `${files.roots().cache}picked/x/a.bin`;
  files.makeDirectory(`${files.roots().cache}picked/x`, {
    intermediates: true,
  });
  files.append(uri, new Uint8Array([1, 2]));
  files.append(uri, new Uint8Array([3]));
  expect([
    ...fs.readFileSync(path.join(root, 'Caches/picked/x/a.bin')),
  ]).toEqual([1, 2, 3]);
  expect(() => files.append(uri, 'text' as never)).toThrow('Not bytes');
  expect(() => files.append('file:///etc/hosts', new Uint8Array([1]))).toThrow(
    'Outside the app folders',
  );
});

describe('a folder picked for an export', () => {
  let clock: number;
  let files: ReturnType<typeof createFiles>;
  let picked: string;
  let pickedUri: string;
  beforeEach(() => {
    clock = 0;
    files = createFiles(
      {
        cache: path.join(root, 'Caches'),
        document: path.join(root, 'Documents'),
      },
      { now: () => clock },
    );
    picked = path.join(root, 'Home');
    fs.mkdirSync(picked);
    fs.writeFileSync(path.join(picked, 'thesis.docx'), 'mine');
    pickedUri = files.grant(picked);
  });

  it('takes what an export does: looking, making folders and copying in', () => {
    const { cache } = files.roots();
    files.write(`${cache}a.pdf`, 'pdf');
    expect(files.list(pickedUri).map(entry => entry.name)).toEqual([
      'thesis.docx',
    ]);
    files.makeDirectory(`${pickedUri}learnX`);
    files.copy(`${cache}a.pdf`, `${pickedUri}learnX/a.pdf`, true);
    expect(files.info(`${pickedUri}learnX/a.pdf`)).toMatchObject({
      exists: true,
      size: 3,
    });
  });

  it('never lets the page read, change or delete what’s there', () => {
    const theirs = `${pickedUri}thesis.docx`;
    expect(() => files.read(theirs, 'utf8')).toThrow('Outside the app folders');
    expect(() => files.write(theirs, 'x')).toThrow('Outside the app folders');
    expect(() => files.remove(theirs)).toThrow('Outside the app folders');
    expect(() => files.remove(pickedUri)).toThrow('Outside the app folders');
    expect(() =>
      files.move(theirs, `${files.roots().cache}stolen.docx`),
    ).toThrow('Outside the app folders');
    expect(() =>
      files.copy(theirs, `${files.roots().cache}stolen.docx`),
    ).toThrow('Outside the app folders');
    expect(() => files.localPath(theirs)).toThrow('Outside the app folders');
    expect(() => files.copy(`${files.roots().cache}`, pickedUri, true)).toThrow(
      'The app folders themselves stay',
    );
    expect(fs.readFileSync(path.join(picked, 'thesis.docx'), 'utf8')).toBe(
      'mine',
    );
  });

  it('closes after a while unused', () => {
    clock = GRANT_IDLE_MS;
    expect(() => files.list(pickedUri)).not.toThrow();
    clock += GRANT_IDLE_MS;
    expect(() => files.list(pickedUri)).not.toThrow();
    clock += GRANT_IDLE_MS + 1;
    expect(() => files.list(pickedUri)).toThrow('Outside the app folders');
  });
});

describe('runFileOperation', () => {
  it('runs the page’s operations, and reports errors as messages', () => {
    const files = createFiles({
      cache: path.join(root, 'Caches'),
      document: path.join(root, 'Documents'),
    });
    const { cache } = files.roots();
    expect(runFileOperation(files, 'write', [`${cache}a.txt`, 'hi'])).toEqual({
      result: undefined,
    });
    expect(runFileOperation(files, 'read', [`${cache}a.txt`, 'utf8'])).toEqual({
      result: 'hi',
    });
    expect(
      runFileOperation(files, 'read', ['file:///etc/hosts', 'utf8']),
    ).toEqual({ error: 'Outside the app folders' });
  });

  it.each(['download', 'grant', 'localPath', 'constructor', '__proto__', 3])(
    'refuses %j, which the page may not call this way',
    op => {
      const files = createFiles({
        cache: path.join(root, 'Caches'),
        document: path.join(root, 'Documents'),
      });
      expect(runFileOperation(files, op, ['/'])).toEqual({
        error: `Unknown file operation: ${String(op)}`,
      });
    },
  );

  it('offers what the page’s stand-in asks for', () => {
    expect([...FILE_OPERATIONS].sort()).toEqual([
      'copy',
      'info',
      'list',
      'makeDirectory',
      'move',
      'read',
      'remove',
      'roots',
      'write',
    ]);
  });
});
