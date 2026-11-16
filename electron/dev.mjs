#!/usr/bin/env node
// Runs learnX in Electron from this checkout: exports the app's web build
// (`expo export -p web`) to build/electron/web and opens it in Electron, with
// everything Electron writes kept in build/electron/data.
//
//   pnpm electron                   export, then launch
//   pnpm electron --skip-export     launch the last export
//   pnpm electron --capture <dir>   let the page save window captures there
//                                   (`await learnx.capture('name')`)
//   LEARNX_LAUNCH_OPTIONS='{"mockLatency":"none"}' pnpm electron
//                                   launch options for a test run, as JSON
//                                   (src/services/launchOptions); the live
//                                   test login also needs TEST_LOGIN=1
//   pnpm electron -- <args>         pass the rest to Electron, such as
//                                   --remote-debugging-port=9222
//
// The first run downloads Electron itself (pnpm install skips its download
// script, see pnpm-workspace.yaml), with its download cache in build/electron.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';

const electronDir = import.meta.dirname;
const root = path.join(electronDir, '..');
const outDir = path.join(root, 'build', 'electron');
const webDir = path.join(outDir, 'web');

const { values, positionals } = parseArgs({
  options: {
    'skip-export': { type: 'boolean', default: false },
    capture: { type: 'string' },
  },
  allowPositionals: true,
});

const require = createRequire(path.join(electronDir, 'package.json'));
const electronPackage = path.dirname(require.resolve('electron/package.json'));
if (!existsSync(path.join(electronPackage, 'path.txt'))) {
  console.log('Downloading Electron…');
  const result = spawnSync(
    process.execPath,
    [path.join(electronPackage, 'install.js')],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        electron_config_cache: path.join(outDir, 'cache'),
      },
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!values['skip-export']) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'expo', 'export', '--platform', 'web', '--output-dir', webDir],
    { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1' } },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** The Electron binary's path, as the electron package's index.js gives it. */
const electron = /** @type {string} */ (require('electron'));
const child = spawn(electron, [electronDir, ...positionals], {
  stdio: 'inherit',
  env: {
    ...process.env,
    LEARNX_DATA_DIR: path.join(outDir, 'data'),
    LEARNX_WEB_DIR: webDir,
    ...(values.capture
      ? { LEARNX_CAPTURE_DIR: path.resolve(values.capture) }
      : {}),
  },
});
child.on('exit', code => process.exit(code ?? 0));
for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM'])) {
  process.on(signal, () => child.kill(signal));
}
