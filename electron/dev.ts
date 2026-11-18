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
// The first run downloads Electron itself (electronApp.ts). On a Mac it opens
// build/electron/learnX.app, a copy of Electron.app named and drawn as learnX
// (macDevApp.ts); `pnpm electron:clean` removes what dev runs leave on the
// Mac (clean.ts).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { electronExecutable, outDir } from './electronApp.ts';
import { exportWeb } from './webExport.ts';

const electronDir = import.meta.dirname;
const webDir = path.join(outDir, 'web');

const { values, positionals } = parseArgs({
  options: {
    'skip-export': { type: 'boolean', default: false },
    capture: { type: 'string' },
  },
  allowPositionals: true,
});

if (!values['skip-export']) {
  exportWeb(webDir);
}

const electron = electronExecutable();
// Linux: the downloaded Electron's chrome-sandbox isn't setuid root, and
// Ubuntu 24.04 and later block the user namespaces Chromium's sandbox uses
// otherwise, so a dev run would abort. Dev runs only: the .deb installs an
// AppArmor profile that allows them, and the AppImage drops the sandbox only
// where it must.
const sandboxArgs = process.platform === 'linux' ? ['--no-sandbox'] : [];
const child = spawn(electron, [electronDir, ...sandboxArgs, ...positionals], {
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
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal));
}
