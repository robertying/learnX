// scripts/lib/derived-data.sh: the lock that lets checkouts take turns with
// the DerivedData folders the scripts share, and the check that a folder holds
// this checkout's build.
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const lib = join(__dirname, '../lib/derived-data.sh');

let root: string;
let folder: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'derived-data-')));
  folder = join(root, 'DerivedData', 'learnX-e2e');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const env = { ...process.env, DERIVED_LOCK_POLL: '0.1' };

/** Runs `script` in bash with the library sourced, from folder `cwd`. */
const run = (script: string, cwd = root) =>
  spawnSync('bash', ['-c', `. "${lib}"; ${script}`], {
    cwd,
    env,
    encoding: 'utf8',
  });

test('runs the command with the lock held, then lets go, keeping its status', () => {
  const result = run(
    `with_derived_lock "${folder}" bash -c 'cat "${folder}.lock/checkout"; exit 3'`,
  );
  expect(result.status).toBe(3);
  expect(result.stdout.trim()).toBe(root);
  expect(existsSync(`${folder}.lock`)).toBe(false);
});

test('a second run waits until the first lets go', async () => {
  const log = join(root, 'log');
  const step = (name: string, seconds: number) =>
    `with_derived_lock "${folder}" bash -c 'echo ${name} start >> "${log}"; sleep ${seconds}; echo ${name} end >> "${log}"'`;
  const ran = (script: string) =>
    new Promise<string>(resolve => {
      let stderr = '';
      const child = spawn('bash', ['-c', `. "${lib}"; ${script}`], {
        cwd: root,
        env,
      });
      child.stderr.on('data', chunk => (stderr += chunk));
      child.on('exit', () => resolve(stderr));
    });

  const first = ran(step('first', 1));
  // The first has the lock before the second asks.
  while (!existsSync(join(root, 'log'))) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  const second = ran(step('second', 0));
  const [, waited] = await Promise.all([first, second]);

  expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
    'first start',
    'first end',
    'second start',
    'second end',
  ]);
  expect(waited).toContain(`Waiting for ${root} to finish with ${folder}`);
});

test('takes over a lock whose run ended without letting go', () => {
  mkdirSync(`${folder}.lock`, { recursive: true });
  writeFileSync(join(`${folder}.lock`, 'pid'), '999999999\n');
  const result = run(`with_derived_lock "${folder}" true`);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
});

test("knows whether the folder holds this checkout's build", () => {
  const checkout = join(root, 'learnX');
  mkdirSync(checkout);
  mkdirSync(folder, { recursive: true });
  const builtFrom = (path: string) =>
    writeFileSync(
      join(folder, 'info.plist'),
      `<plist version="1.0">
<dict>
	<key>LastAccessedDate</key>
	<date>2026-11-20T00:00:00Z</date>
	<key>WorkspacePath</key>
	<string>${path}/ios/learnX.xcworkspace</string>
</dict>
</plist>
`,
    );
  const builtHere = () =>
    run(`derived_built_here "${folder}"`, checkout).status === 0;

  expect(builtHere()).toBe(false);
  builtFrom(checkout);
  expect(builtHere()).toBe(true);
  builtFrom(join(root, 'learnX-verify-1'));
  expect(builtHere()).toBe(false);
});
