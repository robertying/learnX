import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  byteRange,
  createUpdateServer,
  releaseFeed,
} from '../updateServer.mjs';

let dir: string;
let base: string;
let server: ReturnType<typeof createUpdateServer>;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-updates-'));
  for (const [tag, time] of [
    ['v19.0.0', 1],
    ['v19.0.1', 2],
  ] as const) {
    fs.mkdirSync(path.join(dir, tag));
    fs.writeFileSync(path.join(dir, tag, 'latest.yml'), `version: ${tag}`);
    fs.utimesSync(path.join(dir, tag), time, time);
  }
  server = createUpdateServer(dir);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/robertying/learnX`;
});

afterEach(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

it('lists each folder as a release, newest first, as GitHub does', async () => {
  const response = await fetch(`${base}/releases.atom`);
  const feed = await response.text();
  expect(feed).toBe(releaseFeed(dir));
  expect(feed.indexOf('v19.0.1')).toBeLessThan(feed.indexOf('v19.0.0'));
  for (const latest of [
    `${base}/releases/latest`,
    `${base.replace('/robertying/learnX', '')}/api/v3/repos/robertying/learnX/releases/latest`,
  ]) {
    expect(await (await fetch(latest)).json()).toEqual({ tag_name: 'v19.0.1' });
  }
});

it("serves a release's files, whole or in ranges", async () => {
  const url = `${base}/releases/download/v19.0.1/latest.yml`;
  expect(await (await fetch(url)).text()).toBe('version: v19.0.1');
  const partial = await fetch(url, { headers: { range: 'bytes=0-6' } });
  expect(partial.status).toBe(206);
  expect(partial.headers.get('content-range')).toBe('bytes 0-6/16');
  expect(await partial.text()).toBe('version');
  const head = await fetch(url, { method: 'HEAD' });
  expect(head.headers.get('content-length')).toBe('16');
  expect((await fetch(url, { headers: { range: 'bytes=30-40' } })).status).toBe(
    416,
  );
});

it('has no latest release without one', async () => {
  fs.rmSync(path.join(dir, 'v19.0.0'), { recursive: true });
  fs.rmSync(path.join(dir, 'v19.0.1'), { recursive: true });
  expect((await fetch(`${base}/releases/latest`)).status).toBe(404);
});

it('serves nothing else', async () => {
  for (const pathname of [
    '/releases/download/v19.0.1/missing.yml',
    '/releases/download/v19.0.1',
    '/releases/download/..%2F..%2Fetc/passwd',
    '/releases/download/v19.0.1/..',
    '/releases',
  ]) {
    expect((await fetch(`${base}${pathname}`)).status).toBe(404);
  }
});

describe('byteRange', () => {
  it.each([
    [undefined, null],
    ['bytes=0-9', { start: 0, end: 9 }],
    ['bytes=5-', { start: 5, end: 99 }],
    ['bytes=-10', { start: 90, end: 99 }],
    ['bytes=-', 'invalid'],
    ['bytes=9-5', 'invalid'],
    ['bytes=0-100', 'invalid'],
    ['items=0-1', 'invalid'],
  ])('%s', (header, expected) => {
    expect(byteRange(header, 100)).toEqual(expected);
  });
});
