import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { byteRange, createUpdateServer } from '../updateServer.mjs';

let dir: string;
let base: string;
let server: ReturnType<typeof createUpdateServer>;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-updates-'));
  fs.writeFileSync(path.join(dir, 'latest.yml'), 'version: 19.0.1');
  fs.mkdirSync(path.join(dir, 'old'));
  server = createUpdateServer(dir);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

it("serves the folder's files, whole or in ranges, as the mirror does", async () => {
  const url = `${base}/latest.yml`;
  expect(await (await fetch(url)).text()).toBe('version: 19.0.1');
  const partial = await fetch(url, { headers: { range: 'bytes=0-6' } });
  expect(partial.status).toBe(206);
  expect(partial.headers.get('content-range')).toBe('bytes 0-6/15');
  expect(await partial.text()).toBe('version');
  const head = await fetch(url, { method: 'HEAD' });
  expect(head.headers.get('content-length')).toBe('15');
  expect((await fetch(url, { headers: { range: 'bytes=30-40' } })).status).toBe(
    416,
  );
});

it('serves nothing else', async () => {
  for (const pathname of [
    '/',
    '/missing.yml',
    '/old',
    '/..%2F..%2Fetc%2Fpasswd',
    '/old/latest.yml',
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
