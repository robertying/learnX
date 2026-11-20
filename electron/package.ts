#!/usr/bin/env node
// Packages the Electron app for Windows and Linux with electron-builder
// (packageConfig.ts): exports the web build and strips the preloads' types,
// then builds the installers into build/electron/dist. Nothing is signed or
// published.
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
// A test build for trying updates against electron/updateServer.ts:
//   pnpm electron:package --win --version 19.0.1 \
//     --update-url http://localhost:8299/
// which can also trust a throwaway update key instead of the committed one
// (--update-public-key <PEM>, only with such an --update-url), build for one
// CPU architecture (--arch x64 or arm64) and go elsewhere (--output <dir>),
// as updateE2E.ts's builds do.
//
// The installers need NSIS, the AppImage tools and fpm, which electron-builder
// downloads for the computer it runs on (toolsets in packageConfig.ts): a
// Mac, Intel or Apple silicon (no Rosetta), Windows or Linux builds both.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  packageConfig,
  placeholderKeyProblem,
  testKeyProblem,
} from './packageConfig.ts';
import { stripPreloads } from './preloads.ts';
import { exportWeb } from './webExport.ts';

const electronDir = import.meta.dirname;
const root = path.join(electronDir, '..');
const webDir = path.join(root, 'build', 'electron', 'web');

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
    'update-public-key': { type: 'string' },
    arch: { type: 'string' },
    output: { type: 'string' },
  },
});

if (values.arch && values.arch !== 'x64' && values.arch !== 'arm64') {
  console.error('--arch is x64 or arm64');
  process.exit(1);
}
const testKey = testKeyProblem({
  updateUrl: values['update-url'],
  updatePublicKey: values['update-public-key'],
});
if (testKey) {
  console.error(testKey);
  process.exit(1);
}

// Installers that could never update aren't built (packageConfig.ts).
const keyProblem = placeholderKeyProblem(
  {
    dir: values.dir,
    updateUrl: values['update-url'],
    allowPlaceholderKey: values['allow-placeholder-key'],
  },
  fs.readFileSync(
    values['update-public-key'] ??
      path.join(root, 'certs', 'electron-public-key.pem'),
  ),
);
if (keyProblem) {
  console.error(keyProblem);
  process.exit(1);
}

if (!values['skip-export']) {
  exportWeb(webDir);
}
stripPreloads();

// electron-builder's tools (NSIS, AppImage) go to build/electron/cache, with
// Electron's downloads (packageConfig.ts), not the system's cache folder.
process.env.ELECTRON_BUILDER_CACHE ??= path.join(
  root,
  'build',
  'electron',
  'cache',
  'electron-builder',
);

// Loaded only now: it takes a while, and the steps above may stop the run.
const { build } = await import('electron-builder');

/**
 * A test build's own update key (--update-public-key), copied under the name
 * the app reads it by into a folder for packageConfig.ts.
 */
const testKeyDir = () => {
  if (!values['update-public-key']) {
    return undefined;
  }
  const dir = path.join(root, 'build', 'electron', 'test-update-key');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(
    values['update-public-key'],
    path.join(dir, 'electron-public-key.pem'),
  );
  return dir;
};

const both = !values.win && !values.linux;
const arch = values.arch as 'x64' | 'arm64' | undefined;
const config = packageConfig({
  version: values.version,
  build: values.build,
  updateUrl: values['update-url'],
  updateKeyDir: testKeyDir(),
  output: values.output && path.resolve(values.output),
  arch,
});

await build({
  projectDir: electronDir,
  // The config's targets (both CPU architectures, unless --arch) for each
  // platform asked for, or with --dir the unpacked app for each
  // architecture.
  win: values.win || both ? (values.dir ? ['dir'] : []) : undefined,
  linux: values.linux || both ? (values.dir ? ['dir'] : []) : undefined,
  ...(values.dir ? (arch ? { [arch]: true } : { x64: true, arm64: true }) : {}),
  config,
  publish: 'never',
});
