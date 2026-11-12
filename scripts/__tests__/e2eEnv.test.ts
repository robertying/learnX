// The Maestro flows match labels and mock texts through env values that
// scripts/e2e-env.mjs reads from the translations and the mock data, and they
// only run on a device. This catches a mock data or translation edit that
// would leave a flow without its value.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../..');
const maestroDir = join(root, '.maestro');

// Every folder: the tests, their subflows and the store screenshots.
const flows = readdirSync(maestroDir, {
  recursive: true,
  encoding: 'utf8',
}).filter(name => name.endsWith('.yaml'));

const used = new Set(
  flows.flatMap(name =>
    [
      ...readFileSync(join(maestroDir, name), 'utf8').matchAll(
        /\$\{((?:T|MOCK)_\w+)\}/g,
      ),
    ].map(match => match[1]),
  ),
);

const env = new Map(
  execFileSync(
    'node',
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      join(root, 'scripts/e2e-env.mjs'),
    ],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .map(line => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1)] as const;
    }),
);

it('finds values in the flows', () => {
  expect(used.size).toBeGreaterThan(0);
});

// Typed by Maestro, which can't type CJK on Android.
it('has an ASCII search term', () => {
  expect(env.get('MOCK_SEARCH_TERM')).toMatch(/^[\x20-\x7e]+$/);
});

it.each([...used].filter(key => key !== 'MOCK_SEARCH_TERM'))(
  '%s has an English and a Chinese value',
  key => {
    expect(env.get(key)).toMatch(/^[^|\p{Script=Han}]+\|.*\p{Script=Han}/u);
  },
);
