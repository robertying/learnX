// The Maestro flows (and the Electron app's Playwright tests and the Mac app's
// UI tests) match labels
// and mock texts through env values that scripts/e2e/e2e-env.mjs reads from the
// translations and the mock data, and they only run on a device (or in
// Electron). This catches a mock data or translation edit that
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

// The Electron app's Playwright tests name them as `text('MOCK_NOTICE')`.
const electronE2EDir = join(root, 'electron/e2e');
const specs = readdirSync(electronE2EDir).filter(name => name.endsWith('.ts'));

// The Mac app's UI tests name them as `value("MOCK_NOTICE")`.
const macTestsDir = join(root, 'ios/learnXUITests/Mac');
const macTests = readdirSync(macTestsDir).filter(name =>
  name.endsWith('.swift'),
);

const used = new Set([
  ...flows.flatMap(name =>
    [
      ...readFileSync(join(maestroDir, name), 'utf8').matchAll(
        /\$\{((?:T|MOCK)_\w+)\}/g,
      ),
    ].map(match => match[1]),
  ),
  ...specs.flatMap(name =>
    [
      ...readFileSync(join(electronE2EDir, name), 'utf8').matchAll(
        /'((?:T|MOCK)_\w+)'/g,
      ),
    ].map(match => match[1]),
  ),
  ...macTests.flatMap(name =>
    [
      ...readFileSync(join(macTestsDir, name), 'utf8').matchAll(
        /"((?:T|MOCK)_\w+)"/g,
      ),
    ].map(match => match[1]),
  ),
]);

/**
 * Values the same in both languages: the search term, a file of the course
 * taught in English, whose title isn't translated, and an id.
 */
const sameInBoth = new Set([
  'MOCK_SEARCH_TERM',
  'MOCK_OTHER_FILE',
  'MOCK_FILE_COURSE_ID',
]);

const env = new Map(
  execFileSync(
    'node',
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      join(root, 'scripts/e2e/e2e-env.mjs'),
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

it('prints every value the flows and tests use', () => {
  expect([...used].filter(key => !env.has(key))).toEqual([]);
});

it.each([...used].filter(key => !sameInBoth.has(key)))(
  '%s has an English and a Chinese value',
  key => {
    expect(env.get(key)).toMatch(/^[^|\p{Script=Han}]+\|.*\p{Script=Han}/u);
  },
);
