import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileStore, fileName } from '../fileStore.cjs';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-file-store-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('fileName', () => {
  it.each([
    ['settings', 'settings'],
    ['persist:auth', 'persist%3Aauth'],
    ['["content","notices"]', '%5B%22content%22%2C%22notices%22%5D'],
    ['a*b.c', 'a%2Ab%2Ec'],
    ["it's (x)!~", 'it%27s%20%28x%29%21%7E'],
    ['CON', '%43ON'],
    ['com1', '%63om1'],
    ['console', 'console'],
    ['', '%'],
  ])('names %j as %j', (key, name) => {
    expect(fileName(key)).toBe(name);
  });
});

it('keeps values by database and key, across stores', () => {
  const store = createFileStore(root);
  expect(store.readAll('db')).toEqual({});
  expect(store.getItem('db', 'missing')).toBeNull();

  store.setItem('db', 'persist:auth', '{"a":1}');
  store.setItem('db', 'CON', 'device name');
  store.setItem('db', '', 'empty key');
  store.setItem('other', 'persist:auth', 'elsewhere');

  const reopened = createFileStore(root);
  expect(reopened.readAll('db')).toEqual({
    'persist:auth': '{"a":1}',
    CON: 'device name',
    '': 'empty key',
  });
  expect(reopened.getItem('other', 'persist:auth')).toBe('elsewhere');
});

it('replaces, removes and clears', () => {
  const store = createFileStore(root);
  store.setItem('db', 'k', 'one');
  store.setItem('db', 'k', 'two');
  expect(store.getItem('db', 'k')).toBe('two');
  store.removeItem('db', 'k');
  store.removeItem('db', 'never written');
  expect(store.getItem('db', 'k')).toBeNull();
  store.setItem('db', 'k', 'three');
  store.clear('db');
  expect(store.readAll('db')).toEqual({});
});

it('skips a write left unfinished', () => {
  const store = createFileStore(root);
  store.setItem('db', 'k', 'saved');
  fs.writeFileSync(path.join(root, 'db', 'k.tmp'), 'half');
  expect(store.readAll('db')).toEqual({ k: 'saved' });
});
