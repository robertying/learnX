// scripts/check-bundle-env.mjs: release bundles carry the mock login and no
// other .env value. Run in Node (ESM).
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const script = join(__dirname, '../check-bundle-env.mjs');

const problems = (code: string, env: Record<string, string>): string[] =>
  JSON.parse(
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `const { bundleProblems } = await import(${JSON.stringify(script)});
process.stdout.write(JSON.stringify(bundleProblems(Buffer.from(${JSON.stringify(code)}), ${JSON.stringify(env)})));`,
      ],
      { encoding: 'utf8' },
    ),
  );

const env = {
  DUMMY_USERNAME: 'mock-user',
  DUMMY_PASSWORD: 'mock-pass',
  LIVE_PASSWORD: 'live-secret',
  SHORT: 'ab',
};

test('passes a bundle with the mock login and nothing else', () => {
  expect(problems('a"mock-user"b"mock-pass"ab', env)).toEqual([]);
});

test('fails a bundle with another .env value', () => {
  expect(problems('mock-user mock-pass live-secret', env)).toEqual([
    expect.stringMatching(/^contains the \.env value of LIVE_PASSWORD,/),
  ]);
});

test('fails a bundle missing either half of the mock login', () => {
  expect(problems('mock-user', env)).toEqual([
    expect.stringMatching(
      /^doesn't contain the \.env value of DUMMY_PASSWORD:/,
    ),
  ]);
  expect(
    problems('mock-user mock-pass', { ...env, DUMMY_USERNAME: '' }),
  ).toEqual([expect.stringMatching(/DUMMY_USERNAME:/)]);
});

test('ignores values too short to tell apart', () => {
  expect(problems('mock-user mock-pass ab', env)).toEqual([]);
});
