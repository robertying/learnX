// scripts/dev/clean-worktree.sh deletes a worktree and its builds outside it.
// What it must never delete matters more than what it does: another
// worktree, the main checkout, uncommitted or unpushed work.
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '../dev/clean-worktree.sh');

let root: string;
let main: string;
let derivedData: string;

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, stdio: 'ignore' });

/** A worktree on a new branch, with a DerivedData folder for its workspace. */
const addWorktree = (name: string) => {
  const wt = join(root, 'worktrees', name);
  git(main, 'worktree', 'add', '-q', '-b', name, wt);
  const dd = join(derivedData, `learnX-${name}`);
  mkdirSync(join(dd, 'Build'), { recursive: true });
  writeFileSync(
    join(dd, 'info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>WorkspacePath</key>
	<string>${wt}/ios/learnX.xcworkspace</string>
</dict>
</plist>
`,
  );
  return { wt, dd };
};

const cleanFrom = (cwd: string, ...args: string[]) =>
  spawnSync('bash', [script, ...args], {
    cwd,
    env: {
      ...process.env,
      DERIVED_DATA_ROOT: derivedData,
      TMPDIR: join(root, 'tmp'),
    },
    encoding: 'utf8',
  });
const clean = (...args: string[]) => cleanFrom(root, ...args);

const branches = () =>
  execFileSync('git', ['branch', '--format=%(refname:short)'], {
    cwd: main,
    encoding: 'utf8',
  })
    .trim()
    .split('\n');

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'clean-worktree-')));
  main = join(root, 'main');
  derivedData = join(root, 'DerivedData');
  mkdirSync(join(root, 'tmp'));
  mkdirSync(derivedData);
  git(root, 'init', '-q', '--bare', 'origin.git');
  git(root, 'init', '-q', '-b', 'main', 'main');
  git(main, 'config', 'user.email', 'test@example.com');
  git(main, 'config', 'user.name', 'Test');
  git(main, 'commit', '--allow-empty', '-q', '-m', 'base');
  git(main, 'remote', 'add', 'origin', join(root, 'origin.git'));
  git(main, 'push', '-q', 'origin', 'main');
  // Shared caches sit next to the per-workspace folders.
  mkdirSync(join(derivedData, 'ModuleCache.noindex'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

test('a dry run lists what it would remove and removes nothing', () => {
  const { wt, dd } = addWorktree('done');
  const result = clean(wt);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain(`worktree ${wt}`);
  expect(result.stdout).toContain(`DerivedData ${dd}`);
  expect(result.stdout).toContain('dry run');
  expect(existsSync(wt)).toBe(true);
  expect(existsSync(dd)).toBe(true);
});

test('--apply removes only that worktree, its DerivedData and its pushed branch', () => {
  const done = addWorktree('done');
  const other = addWorktree('other');
  git(done.wt, 'push', '-q', 'origin', 'done');
  const xcodeTemp = join(root, 'tmp', done.dd.replaceAll('/', '_') + '.lock');
  writeFileSync(xcodeTemp, '');

  const result = clean('--apply', done.wt);

  expect(result.status).toBe(0);
  expect(existsSync(done.wt)).toBe(false);
  expect(existsSync(done.dd)).toBe(false);
  expect(existsSync(xcodeTemp)).toBe(false);
  expect(branches()).not.toContain('done');
  expect(existsSync(other.wt)).toBe(true);
  expect(existsSync(other.dd)).toBe(true);
  expect(existsSync(join(derivedData, 'ModuleCache.noindex'))).toBe(true);
  expect(existsSync(main)).toBe(true);
});

test('refuses while a script builds or tests in its DerivedData', () => {
  const { wt, dd } = addWorktree('done');
  git(wt, 'push', '-q', 'origin', 'done');
  // As scripts/lib/derived-data.sh holds it: a live run's pid.
  mkdirSync(`${dd}.lock`);
  writeFileSync(join(`${dd}.lock`, 'pid'), `${process.pid}\n`);
  writeFileSync(join(`${dd}.lock`, 'checkout'), `${main}\n`);

  const result = clean('--apply', wt);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain(`a run from ${main} is using ${dd}`);
  expect(existsSync(wt)).toBe(true);
  expect(existsSync(dd)).toBe(true);

  // Once that run has ended, its lock no longer counts.
  writeFileSync(join(`${dd}.lock`, 'pid'), '999999999\n');
  expect(clean('--apply', wt).status).toBe(0);
  expect(existsSync(dd)).toBe(false);
});

test('runs from inside the worktree it removes', () => {
  const { wt } = addWorktree('done');
  git(wt, 'push', '-q', 'origin', 'done');

  const result = cleanFrom(wt, '--apply', wt);

  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  expect(existsSync(wt)).toBe(false);
});

test('removes a branch with no commits of its own', () => {
  // Its tip is origin/main's, so nothing is lost with it.
  const { wt } = addWorktree('unused');
  const result = clean('--apply', wt);
  expect(result.status).toBe(0);
  expect(existsSync(wt)).toBe(false);
  expect(branches()).not.toContain('unused');
});

test.each([
  ['the main checkout', () => main, 'main checkout'],
  [
    'a folder inside a worktree',
    () => {
      const { wt } = addWorktree('parent');
      mkdirSync(join(wt, 'ios'));
      return join(wt, 'ios');
    },
    'pass the worktree',
  ],
  [
    'a locked worktree',
    () => {
      const { wt } = addWorktree('slot');
      git(main, 'worktree', 'lock', '--reason', 'kept', wt);
      return wt;
    },
    'locked',
  ],
  [
    'uncommitted changes',
    () => {
      const { wt } = addWorktree('dirty');
      writeFileSync(join(wt, 'new.txt'), 'x');
      return wt;
    },
    'uncommitted changes',
  ],
  [
    'commits on no remote branch',
    () => {
      const { wt } = addWorktree('unpushed');
      git(wt, 'commit', '--allow-empty', '-q', '-m', 'work');
      return wt;
    },
    'commits on no remote branch',
  ],
])('refuses %s', (_, target, message) => {
  const path = target();
  const result = clean('--apply', path);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(message);
  expect(existsSync(path)).toBe(true);
});

test('--discard-changes removes a worktree with unpushed work, and keeps its branch', () => {
  const { wt } = addWorktree('abandoned');
  git(wt, 'commit', '--allow-empty', '-q', '-m', 'work');
  writeFileSync(join(wt, 'new.txt'), 'x');
  const result = clean('--apply', '--discard-changes', wt);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('keeps branch abandoned');
  expect(existsSync(wt)).toBe(false);
  expect(branches()).toContain('abandoned');
});
