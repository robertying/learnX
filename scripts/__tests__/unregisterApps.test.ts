// scripts/dev/unregister-apps.sh unregisters learnX's copies from Launch
// Services by reading its dump. What it must leave registered matters more
// than what it removes: the installed app, other apps whose id only starts
// the same way, and the App Store's placeholders. `lsregister` and
// `pluginkit` are stand-ins that print the dump below and log their calls.
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '../dev/unregister-apps.sh');

let dir: string;

const record = (kind: 'bundle' | 'plugin', path: string, id: string) =>
  `--------------------------------------------------------------------------------
${kind} id:                  learnX (0x1234)
path:                       ${path} (0x5678)
identifier:                 ${id}
infoDictionary:             1 values
                            {
                                Path = "/somewhere/else.app";
                            }
`;

const installed = '/Applications/learnX.app';
const derived = '/DerivedData/learnX-a/Build/Products/Debug-maccatalyst';
const placeholder =
  '/Library/Daemon Containers/X/Data/Library/Caches/Placeholders-v6.noindex/io.robertying.learnX-19.0.0/learnX.app';

const dump = [
  record('bundle', installed, 'io.robertying.learnX'),
  record(
    'plugin',
    `${installed}/Contents/PlugIns/ShareExtension.appex`,
    'io.robertying.learnX.ShareExtension',
  ),
  record('bundle', `${derived}/learnX.app`, 'io.robertying.learnX'),
  record(
    'plugin',
    `${derived}/learnX.app/Contents/PlugIns/ShareExtension.appex`,
    'io.robertying.learnX.ShareExtension',
  ),
  // An extension whose app has no record of its own.
  record(
    'plugin',
    '/Archives/a b.xcarchive/Products/Applications/learnX.app/Contents/PlugIns/ShareExtension.appex',
    'io.robertying.learnX.ShareExtension',
  ),
  record('bundle', placeholder, 'io.robertying.learnX'),
  record(
    'bundle',
    '/build/electron/learnX.app',
    'io.robertying.learnXElectron',
  ),
  record('bundle', '/Other/Other.app', 'com.example.other'),
].join('');

const run = (args: string[], env: Record<string, string> = {}) => {
  const result = spawnSync('bash', [script, ...args], {
    env: {
      PATH: `${dir}/bin:${process.env.PATH}`,
      LSREGISTER: join(dir, 'bin', 'lsregister'),
      ...env,
    },
    encoding: 'utf8',
  });
  const log = (name: string) =>
    readFileSync(join(dir, name), 'utf8').split('\n').filter(Boolean);
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    lsregister: log('lsregister.log'),
    pluginkit: log('pluginkit.log'),
  };
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'unregister-apps-'));
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'dump.txt'), dump);
  writeFileSync(join(dir, 'lsregister.log'), '');
  writeFileSync(join(dir, 'pluginkit.log'), '');
  writeFileSync(
    join(dir, 'bin', 'lsregister'),
    `#!/bin/bash
if [ "$1" = -dump ]; then cat "${dir}/dump.txt"; else echo "$*" >> "${dir}/lsregister.log"; fi
`,
  );
  writeFileSync(
    join(dir, 'bin', 'pluginkit'),
    `#!/bin/bash
echo "$*" >> "${dir}/pluginkit.log"
`,
  );
  chmodSync(join(dir, 'bin', 'lsregister'), 0o755);
  chmodSync(join(dir, 'bin', 'pluginkit'), 0o755);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const archive = '/Archives/a b.xcarchive/Products/Applications/learnX.app';

test('a dry run lists the copies and unregisters nothing', () => {
  const { status, stdout, lsregister, pluginkit } = run([]);
  expect(status).toBe(0);
  expect(stdout).toContain(`keeps ${installed}\n`);
  expect(stdout).toContain(`keeps ${placeholder}\n`);
  expect(stdout).toContain(
    `unregisters ${derived}/learnX.app (already deleted)`,
  );
  expect(stdout).toContain(`unregisters ${archive} (already deleted)`);
  expect(stdout).not.toContain('electron');
  expect(stdout).not.toContain('Other.app');
  expect(stdout).toContain('dry run: pass --apply to unregister these 2');
  expect(lsregister).toEqual([]);
  expect(pluginkit).toEqual([]);
});

test('--apply unregisters every other copy and its extensions', () => {
  const { status, lsregister, pluginkit } = run(['--apply']);
  expect(status).toBe(0);
  expect(pluginkit).toEqual([
    `-r ${derived}/learnX.app/Contents/PlugIns/ShareExtension.appex`,
    `-r ${archive}/Contents/PlugIns/ShareExtension.appex`,
  ]);
  // Registered again only where it is installed.
  expect(lsregister.filter(call => call.startsWith('-u'))).toEqual([
    `-u ${derived}/learnX.app`,
    `-u ${archive}`,
  ]);
});

test('--keep replaces the default, and kept apps on disk are registered again', () => {
  const kept = join(dir, 'Kept.app');
  mkdirSync(kept);
  const { lsregister } = run([
    '--apply',
    '--keep',
    `${derived}/learnX.app`,
    `--keep=${kept}`,
  ]);
  expect(lsregister).toEqual([
    `-u ${installed}`,
    `-u ${archive}`,
    `-f ${kept}`,
  ]);
});

test('$LEARNX_KEEP_APPS lists the apps to keep', () => {
  const { lsregister } = run(['--apply'], {
    LEARNX_KEEP_APPS: `${archive}:${derived}/learnX.app`,
  });
  expect(lsregister).toEqual([`-u ${installed}`]);
});

test('--keep-none keeps only the App Store placeholders', () => {
  const { stdout, lsregister } = run(['--apply', '--keep-none']);
  expect(stdout).toContain(`keeps ${placeholder}\n`);
  expect(lsregister).toEqual([
    `-u ${installed}`,
    `-u ${derived}/learnX.app`,
    `-u ${archive}`,
  ]);
});

test('says so when no other copy is registered', () => {
  writeFileSync(
    join(dir, 'dump.txt'),
    record('bundle', installed, 'io.robertying.learnX'),
  );
  const { status, stdout } = run(['--apply']);
  expect(status).toBe(0);
  expect(stdout).toContain(
    'no other copy of io.robertying.learnX is registered',
  );
});

test('rejects unknown options', () => {
  const { status, stderr } = run(['--force']);
  expect(status).toBe(2);
  expect(stderr).toContain('usage:');
});
