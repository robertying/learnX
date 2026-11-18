// scripts/changed-files.sh decides whether the required Android and Electron
// jobs build a pull request. A path it misses lets a break merge with the
// required checks green, so each kind of path is listed here.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const script = join(__dirname, '../changed-files.sh');

let repo: string;

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repo, stdio: 'ignore' });

/**
 * The script's output for `target` on a pull request (or `event`) that
 * changes `paths`.
 */
const changed = (
  paths: string[],
  target = 'android',
  event = 'pull_request',
) => {
  git('commit', '--allow-empty', '-q', '-m', 'base');
  for (const path of paths) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), 'x');
  }
  git('add', '-A');
  git('commit', '--allow-empty', '-q', '-m', 'change');
  return execFileSync('bash', [script, target], {
    cwd: repo,
    env: { ...process.env, GITHUB_EVENT_NAME: event },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
};

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'changed-files-'));
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

test.each([
  'android/app/build.gradle',
  'android/patch-tests/src/test/Example.kt',
  'modules/share/android/src/main/Share.kt',
  'modules/share/expo-module.config.json',
  'modules/unit-tests.gradle',
  'patches/react-native@0.88.1.patch',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'app.json',
  '.node-version',
  'scripts/changed-files.sh',
  'scripts/test-android.sh',
  'scripts/android-coverage.mjs',
  'scripts/ota-e2e-cert.sh',
  '.github/workflows/android.yml',
  '.github/actions/setup-js/action.yml',
])('%s builds Android', path => {
  expect(changed([path])).toBe('changed=true');
});

test.each([
  'src/screens/Today.tsx',
  'ios/learnX/AppDelegate.swift',
  'modules/share/ios/Share.swift',
  'modules/share/src/index.ts',
  'scripts/test-ios.sh',
  '.github/workflows/apple.yml',
  '.github/workflows/js.yml',
  '.github/workflows/electron.yml',
  'docs/README.md',
])('%s alone skips Android', path => {
  expect(changed([path])).toBe('changed=false');
});

test('one Android path among others builds Android', () => {
  expect(changed(['src/screens/Today.tsx', 'android/build.gradle'])).toBe(
    'changed=true',
  );
});

test.each([
  'src/screens/Today.tsx',
  'electron/main.ts',
  'modules/share/src/index.ts',
  'patches/react-native@0.88.1.patch',
  'package.json',
  'pnpm-lock.yaml',
  'scripts/changed-files.sh',
  'scripts/write-e2e-env.sh',
  '.github/workflows/electron.yml',
  '.github/actions/setup-js/action.yml',
])('%s builds Electron', path => {
  expect(changed([path], 'electron')).toBe('changed=true');
});

test.each([
  'ios/learnX/AppDelegate.swift',
  'android/app/build.gradle',
  'modules/share/ios/Share.swift',
  'modules/share/android/src/main/Share.kt',
  '.maestro/01-login.yaml',
  'fastlane/Fastfile',
  'docs/README.md',
  'electron/AGENTS.md',
  '.github/workflows/js.yml',
  '.github/workflows/android.yml',
  '.github/workflows/apple.yml',
  '.github/workflows/caches.yml',
])('%s alone skips Electron', path => {
  expect(changed([path], 'electron')).toBe('changed=false');
});

test('one Electron path among others builds Electron', () => {
  expect(
    changed(
      ['ios/learnX/AppDelegate.swift', 'src/screens/Today.tsx'],
      'electron',
    ),
  ).toBe('changed=true');
});

test.each(['android', 'electron'])(
  'main pushes and manual runs always build %s',
  target => {
    expect(changed(['docs/README.md'], target, 'push')).toBe('changed=true');
    expect(changed(['docs/README.md'], target, 'workflow_dispatch')).toBe(
      'changed=true',
    );
  },
);

test('an unknown target fails', () => {
  expect(() => changed(['docs/README.md'], 'web')).toThrow('Command failed');
});
