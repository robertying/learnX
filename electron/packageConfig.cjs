// electron-builder's config for Windows and Linux, which package.mjs
// (`pnpm electron:package`) passes it after exporting the web build. Not
// named electron-builder.config.*, which electron-builder would also load
// itself. Builds are
// unsigned while the app is experimental, and never for macOS, which has the
// Mac Catalyst app. Installers go to build/electron/dist.
const path = require('node:path');
const { readBuildInfo } = require('./buildInfo.cjs');

/** Where the packaged app looks for updates (releasesProvider.cjs). */
const RELEASES_URL = 'https://github.com/robertying/learnX';

const { version, build } = readBuildInfo(path.join(__dirname, '..'));

/**
 * The config for a version, build number and update URL: the checkout's,
 * and GitHub's, unless a test build (package.mjs) sets them.
 *
 * @param {{ version?: string; build?: string; updateUrl?: string }} [options]
 * @returns {import('electron-builder').Configuration}
 */
const config = (options = {}) => {
  const appVersion = options.version ?? version;
  const buildNumber = options.build ?? build;
  return {
    appId: 'io.robertying.learnXElectron',
    productName: 'learnX',
    copyright: `Copyright © ${new Date().getFullYear()} Rui Ying`,
    // Written into the packaged app's package.json: the version, the build
    // number (main.cjs, Settings › About) and where updates come from. The
    // description is what Windows shows as the file's (Task Manager), with the
    // author as its company.
    extraMetadata: {
      version: appVersion,
      buildNumber,
      updateUrl: options.updateUrl ?? RELEASES_URL,
      description: 'learnX',
      // Linux: Electron names the window after it (Wayland's app_id, X11's
      // WM_CLASS), which links it to learnx.desktop (syncDesktopName).
      desktopName: 'learnx.desktop',
      author: { name: 'Rui Ying', email: 'learnX@ruiying.io' },
    },
    // Windows' file version: the version and the build number.
    buildVersion: `${appVersion}.${buildNumber}`,
    directories: { output: '../build/electron/dist', buildResources: 'icons' },
    // Electron's downloads for each platform, kept with the dev runner's.
    electronDownload: {
      cache: path.join(__dirname, '..', 'build', 'electron', 'cache'),
    },
    files: [
      '*.cjs',
      '!packageConfig.cjs',
      '!electronApp.cjs',
      'icons/icon.png',
      'icons/icon.ico',
      { from: '../build/electron/web', to: 'web' },
    ],
    // Only electron-updater's update files: nothing is published from here.
    publish: { provider: 'github', owner: 'robertying', repo: 'learnX' },
    win: {
      // One installer for both: Windows installs the one for its CPU.
      target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
      icon: 'icons/icon.ico',
      executableName: 'learnX',
      legalTrademarks: 'learnX (Experimental)',
    },
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      shortcutName: 'learnX',
      uninstallDisplayName: 'learnX',
      artifactName: 'learnX-Setup-${version}.${ext}',
    },
    linux: {
      target: [
        { target: 'AppImage', arch: ['x64', 'arm64'] },
        { target: 'deb', arch: ['x64', 'arm64'] },
      ],
      icon: 'icons/icon.png',
      executableName: 'learnx',
      artifactName: 'learnX-${version}-${arch}.${ext}',
      category: 'Education',
      synopsis: 'Tsinghua Web Learning (Experimental)',
      description: 'learnX for Tsinghua Web Learning. Experimental.',
      maintainer: 'Rui Ying <learnX@ruiying.io>',
      vendor: 'Rui Ying',
      // learnx.desktop, with StartupWMClass learnx: the window's class
      // (desktopName above).
      syncDesktopName: true,
      desktop: {
        entry: { Name: 'learnX', Comment: 'Tsinghua Web Learning' },
      },
    },
    deb: {
      packageName: 'learnx',
      // AppImages update themselves; a .deb is updated by installing the
      // next one.
      artifactName: 'learnX-${version}-${arch}.${ext}',
    },
  };
};

module.exports = { RELEASES_URL, packageConfig: config };
