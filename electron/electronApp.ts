// The Electron app to run from this checkout: on a Mac build/electron/
// learnX.app (macDevApp.ts), elsewhere the downloaded Electron binary.
// Downloads Electron on first use: pnpm install skips its download script
// (see pnpm-workspace.yaml), with its download cache in build/electron.
// The dev runner (dev.ts) and Playwright's E2E fixtures (e2e/fixtures.ts)
// both start the app from here.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { macDevApp } from './macDevApp.ts';

const require = createRequire(import.meta.url);
const electronDir = import.meta.dirname;
const root = path.join(electronDir, '..');
export const outDir = path.join(root, 'build', 'electron');

/** The executable that runs this folder as the app. */
export const electronExecutable = (): string => {
  const electronPackage = path.dirname(
    require.resolve('electron/package.json'),
  );
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
  return process.platform === 'darwin'
    ? macDevApp({
        electronApp: path.join(electronPackage, 'dist', 'Electron.app'),
        electronVersion: (
          require('electron/package.json') as { version: string }
        ).version,
        iconSource: path.join(root, 'ios', 'learnX', 'AppIcon.icon'),
        outDir,
      })
    : // Loaded only now: it throws until Electron is downloaded. In Node it's
      // the executable's path.
      (require('electron') as string);
};
