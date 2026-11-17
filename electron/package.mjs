#!/usr/bin/env node
// Packages the Electron app for Windows and Linux with electron-builder
// (packageConfig.cjs): exports the web build, then builds the
// installers into build/electron/dist. Nothing is signed or published.
//
//   pnpm electron:package                    Windows and Linux
//   pnpm electron:package --win              Windows only (NSIS, x64 and arm64)
//   pnpm electron:package --linux            Linux only (AppImage and .deb)
//   pnpm electron:package --skip-export      reuse the last web export
//   pnpm electron:package --dir              the unpacked apps only (x64 and
//                                            arm64), no installers
//
// A test build for trying updates against electron/updateServer.mjs:
//   pnpm electron:package --win --version 19.0.1 --update-host localhost:8299
//
// The installers need NSIS's and the AppImage tools, which electron-builder
// downloads; on an Apple silicon Mac those run only with Rosetta, so build
// them on Windows or in CI there, and use --dir on the Mac.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';

const electronDir = import.meta.dirname;
const root = path.join(electronDir, '..');
const webDir = path.join(root, 'build', 'electron', 'web');
const require = createRequire(path.join(electronDir, 'package.json'));

const { values } = parseArgs({
  options: {
    win: { type: 'boolean', default: false },
    linux: { type: 'boolean', default: false },
    'skip-export': { type: 'boolean', default: false },
    version: { type: 'string' },
    build: { type: 'string' },
    'update-host': { type: 'string' },
    dir: { type: 'boolean', default: false },
  },
});

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

// electron-builder's tools (NSIS, AppImage) go to build/electron/cache, with
// Electron's downloads (packageConfig.cjs), not the system's cache folder.
process.env.ELECTRON_BUILDER_CACHE ??= path.join(
  root,
  'build',
  'electron',
  'cache',
  'electron-builder',
);

const { build } = require('electron-builder');
const { packageConfig } = require('./packageConfig.cjs');
const both = !values.win && !values.linux;

await build({
  projectDir: electronDir,
  // The config's targets (both CPU architectures) for each platform asked
  // for, or with --dir the unpacked app for each architecture.
  win: values.win || both ? (values.dir ? ['dir'] : []) : undefined,
  linux: values.linux || both ? (values.dir ? ['dir'] : []) : undefined,
  ...(values.dir ? { x64: true, arm64: true } : {}),
  config: packageConfig({
    version: values.version,
    build: values.build,
    updateHost: values['update-host'],
  }),
  publish: 'never',
});
