// scripts/release/symbolicate.mjs: which source map decodes a Crashlytics report, and
// the decoding itself, run in Node (ESM) like the script.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '../release/symbolicate.mjs');

/** Calls one of the script's exports with JSON arguments, in Node. */
const call = (name: string, ...args: unknown[]): unknown =>
  JSON.parse(
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `const m = await import(${JSON.stringify(script)});
try {
  process.stdout.write(JSON.stringify({ value: m.${name}(...${JSON.stringify(args)}) }));
} catch (error) {
  process.stdout.write(JSON.stringify({ error: error.message }));
}`,
      ],
      { encoding: 'utf8' },
    ),
  );

const mapPath = (report: Record<string, string>) =>
  call('mapPath', report, '/repo');

it("uses the store build's map for the built-in bundle", () => {
  expect(mapPath({ platform: 'ios', version: '19.0.0', build: '190' })).toEqual(
    {
      value:
        '/repo/build/release/v19.0.0/sourcemaps/learnX-ios-v19.0.0-190.map',
    },
  );
  expect(
    mapPath({
      platform: 'android',
      bundle: 'embedded',
      version: 'v19.0.0',
      build: '9200190',
    }),
  ).toEqual({
    value:
      '/repo/build/release/v19.0.0/sourcemaps/learnX-android-v19.0.0-9200190.map',
  });
  expect(mapPath({ platform: 'macos' })).toEqual({
    error: expect.stringContaining('--version and --build'),
  });
});

it("uses an update's map, the iOS one on the Mac", () => {
  expect(mapPath({ platform: 'macos', bundle: 'abc-123' })).toEqual({
    value: '/repo/build/ota/updates/abc-123/ios.map',
  });
  expect(mapPath({ platform: 'android', bundle: 'abc-123' })).toEqual({
    value: '/repo/build/ota/updates/abc-123/android.map',
  });
});

it('refuses an unknown platform', () => {
  expect(mapPath({ platform: 'web', bundle: 'x' })).toEqual({
    error: expect.stringContaining('--platform'),
  });
});

describe('symbolicate', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'symbolicate-test-'));
    // Column 0 of the bundle is src/a.ts line 1 (foo), column 10 its line 2 (bar).
    writeFileSync(
      join(dir, 'test.map'),
      JSON.stringify({
        version: 3,
        sources: ['src/a.ts'],
        names: ['foo', 'bar'],
        mappings: 'AAAAA,UACEC',
      }),
    );
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('decodes frames as iOS and Android reports show them', () => {
    const stack = [
      'TypeError: x',
      'foo main.jsbundle:1:0',
      'JS.bar(index.android.bundle:1:10)',
    ].join('\n');
    expect(call('symbolicate', join(dir, 'test.map'), stack)).toEqual({
      value: [
        'TypeError: x',
        'foo src/a.ts:1:foo',
        'JS.bar(src/a.ts:2:bar)',
      ].join('\n'),
    });
  });
});
