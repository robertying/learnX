// The Electron app to run from this checkout: on a Mac build/electron/
// learnX.app (macDevApp.mjs), elsewhere the downloaded Electron binary.
// Downloads Electron on first use: pnpm install skips its download script
// (see pnpm-workspace.yaml), with its download cache in build/electron.
// CommonJS, so Playwright's E2E fixtures (e2e/fixtures.ts) can load it too.
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const electronDir = __dirname;
const root = path.join(electronDir, '..');
const outDir = path.join(root, 'build', 'electron');

/** The executable that runs this folder as the app. */
const electronExecutable = () => {
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
    ? require('./macDevApp.mjs').macDevApp({
        electronApp: path.join(electronPackage, 'dist', 'Electron.app'),
        electronVersion: require('electron/package.json').version,
        iconSource: path.join(root, 'ios', 'learnX', 'AppIcon.icon'),
        outDir,
      })
    : /** @type {string} */ (/** @type {unknown} */ (require('electron')));
};

module.exports = { electronExecutable, outDir };
