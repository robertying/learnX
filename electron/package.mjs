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
//   pnpm electron:package --allow-placeholder-key
//                                            installers while the update key
//                                            is the placeholder: never release
//
// A test build for trying updates against electron/updateServer.mjs:
//   pnpm electron:package --win --version 19.0.1 \
//     --update-url http://localhost:8299/
//
// The installers need NSIS, the AppImage tools and fpm, which electron-builder
// downloads for the computer it runs on (toolsets in packageConfig.cjs): a
// Mac, Intel or Apple silicon (no Rosetta), Windows or Linux builds both.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { exportWeb } from './webExport.mjs';

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
    'update-url': { type: 'string' },
    dir: { type: 'boolean', default: false },
    'allow-placeholder-key': { type: 'boolean', default: false },
  },
});

// Installers that could never update aren't built (packageConfig.cjs).
const { packageConfig, placeholderKeyProblem } = require('./packageConfig.cjs');
const keyProblem = placeholderKeyProblem(
  {
    dir: values.dir,
    updateUrl: values['update-url'],
    allowPlaceholderKey: values['allow-placeholder-key'],
  },
  fs.readFileSync(path.join(root, 'certs', 'electron-public-key.pem')),
);
if (keyProblem) {
  console.error(keyProblem);
  process.exit(1);
}

if (!values['skip-export']) {
  exportWeb(webDir);
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
    updateUrl: values['update-url'],
  }),
  publish: 'never',
});
