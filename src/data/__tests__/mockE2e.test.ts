// The Maestro flows match labels and mock texts through env values that
// scripts/e2e-env.mjs reads from the translations and the mock data, and they
// only run on a device. This catches a mock data or translation edit that
// would leave a flow without its value.
// No Node types in this project: just the calls used here.
declare const __dirname: string;
const fs: {
  readdirSync: (dir: string) => string[];
  readFileSync: (file: string, encoding: 'utf8') => string;
} = require('fs');
const { join }: { join: (...parts: string[]) => string } = require('path');
const {
  execFileSync,
}: {
  execFileSync: (
    file: string,
    args: string[],
    options: { encoding: 'utf8' },
  ) => string;
} = require('child_process');

const root = join(__dirname, '../../..');
const maestroDir = join(root, '.maestro');

const flows = [
  ...fs.readdirSync(maestroDir),
  ...fs.readdirSync(join(maestroDir, 'subflows')).map(n => `subflows/${n}`),
].filter(name => name.endsWith('.yaml'));

const used = new Set(
  flows.flatMap(name =>
    [
      ...fs
        .readFileSync(join(maestroDir, name), 'utf8')
        .matchAll(/\$\{((?:T|MOCK)_\w+)\}/g),
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
