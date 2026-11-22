// scripts/release/bump.sh turns `pnpm bump …` into the arguments of
// fastlane's bump lane (which has the version and build rules): a version for
// main, or a release build number that stays out of the repo. A stand-in
// `bundle` records what the script would run.
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'bump-'));
  mkdirSync(join(root, 'scripts/release'), { recursive: true });
  mkdirSync(join(root, 'bin'));
  copyFileSync(
    join(__dirname, '../release/bump.sh'),
    join(root, 'scripts/release/bump.sh'),
  );
  writeFileSync(join(root, 'package.json'), '{ "version": "18.4.2" }\n');
  writeFileSync(
    join(root, 'bin/bundle'),
    `#!/bin/bash\necho "$@" > "${root}/args"\n`,
  );
  chmodSync(join(root, 'bin/bundle'), 0o755);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** The arguments fastlane gets, or the script's exit code and message. */
const bump = (...args: string[]) => {
  const { status, stderr } = spawnSync(
    'bash',
    [join(root, 'scripts/release/bump.sh'), ...args],
    {
      env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
      encoding: 'utf8',
    },
  );
  if (status !== 0) {
    return { status, stderr };
  }
  return readFileSync(join(root, 'args'), 'utf8').trim();
};

it.each([
  [[], 'exec fastlane bump'],
  [['build'], 'exec fastlane bump'],
  [['patch'], 'exec fastlane bump version:18.4.3'],
  [['minor'], 'exec fastlane bump version:18.5.0'],
  [['major'], 'exec fastlane bump version:19.0.0'],
  [['19.0.0'], 'exec fastlane bump version:19.0.0'],
])('turns %j into the version lane argument', (args, expected) => {
  expect(bump(...args)).toBe(expected);
});

it.each([
  [['--build', '4560'], 'exec fastlane bump build:4560'],
  [['build', '--build', '4560'], 'exec fastlane bump build:4560'],
  [['--offline'], 'exec fastlane bump remote:false'],
  [
    ['--offline', '--build', '4560'],
    'exec fastlane bump build:4560 remote:false',
  ],
])('passes the build number of %j to the lane', (args, expected) => {
  expect(bump(...args)).toBe(expected);
});

it.each([
  [['--build']],
  [['--build', 'abc']],
  [['--build', '45.6']],
  [['patch', 'minor']],
  [['nonsense']],
  // The version is committed and the build number isn't: separate runs.
  [['19.0.0', '--build', '4560']],
  [['--build', '4560', 'minor']],
  [['patch', '--offline']],
])('rejects %j', args => {
  expect(bump(...args)).toMatchObject({
    status: 1,
    stderr: expect.stringContaining('Usage: pnpm bump'),
  });
});
