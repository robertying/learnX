// electron-builder's config for Windows and Linux, which package.mjs
// (`pnpm electron:package`) passes it after exporting the web build. Not
// named electron-builder.config.*, which electron-builder would also load
// itself. Builds are unsigned, and never for macOS, which has the Mac
// Catalyst app. Installers go to build/electron/dist.
const path = require('node:path');
const updateMirror = require('../src/constants/updateMirror.json');
const { readBuildInfo } = require('./buildInfo.cjs');
const { SHARED_FILES } = require('./shared.cjs');
const { isPlaceholderKey } = require('./updateSignature.cjs');

const { version, build } = readBuildInfo(path.join(__dirname, '..'));

/**
 * The config for a version and build number (the checkout's unless a test
 * build sets them, package.mjs), and `updateUrl`, a test server standing in
 * for the mirror (updateServer.mjs).
 *
 * @param {{ version?: string; build?: string; updateUrl?: string }} [options]
 * @returns {import('electron-builder').Configuration}
 */
const config = (options = {}) => {
  const appVersion = options.version ?? version;
  const buildNumber = options.build ?? build;
  const updateUrl = options.updateUrl ?? `${updateMirror.latestRelease}/`;
  return {
    appId: 'io.robertying.learnXElectron',
    productName: 'learnX',
    copyright: `Copyright © ${new Date().getFullYear()} Rui Ying`,
    // Written into the packaged app's package.json: the version and the build
    // number (main.cjs, Settings › About). The
    // description is what Windows shows as the file's (Task Manager), with the
    // author as its company.
    extraMetadata: {
      version: appVersion,
      buildNumber,
      // Where updates come from, as app-update.yml has it (`publish`), for
      // the provider that checks their signature (updater.cjs).
      updateUrl,
      description: 'learnX',
      // Linux: Electron names the window after it (Wayland's app_id, X11's
      // WM_CLASS), which links it to learnx.desktop (syncDesktopName).
      desktopName: 'learnx.desktop',
      author: { name: 'Rui Ying', email: 'learnX@ruiying.io' },
      // The .deb's Homepage field, which electron-builder requires.
      homepage: 'https://github.com/robertying/learnX',
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
      // What the main process shares with the page (shared.cjs).
      { from: '../src/constants', to: 'constants', filter: SHARED_FILES },
      // The key update files are signed with (updateSignature.cjs).
      { from: '../certs', to: '.', filter: ['electron-update.pem'] },
    ],
    // Where the packaged app finds updates (app-update.yml): the TUNA
    // mirror's copy of the latest GitHub release (`v<version>`, with the
    // mobile and desktop builds of a version), as the Android app's updater
    // reads it (src/helpers/update.ts). Also makes electron-builder write the
    // update files (latest.yml, latest-linux.yml, latest-linux-arm64.yml);
    // nothing is published from here.
    publish: { provider: 'generic', url: updateUrl },
    win: {
      // One installer for both: Windows installs the one for its CPU.
      target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
      icon: 'icons/icon.ico',
      executableName: 'learnX',
    },
    nsis: {
      oneClick: false,
      perMachine: false,
      // Per user only, and what uninstalling removes (installer.nsh).
      include: 'installer.nsh',
      deleteAppDataOnUninstall: true,
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
      synopsis: 'Tsinghua Web Learning',
      description: 'learnX for Tsinghua Web Learning.',
      maintainer: 'Rui Ying <learnX@ruiying.io>',
      vendor: 'Rui Ying',
      // learnx.desktop, with StartupWMClass learnx: the window's class
      // (desktopName above).
      syncDesktopName: true,
      desktop: {
        entry: { Name: 'learnX', Comment: 'Tsinghua Web Learning' },
      },
    },
    // The AppImage's runtime: the static one (type2-runtime), which needs
    // neither libfuse2 (gone from Ubuntu since 22.04) nor libz.so (only in
    // zlib1g-dev, which the legacy arm64 runtime links against). Its AppRun
    // drops Chromium's sandbox only where the system blocks unprivileged
    // user namespaces (Ubuntu 24.04 and later), which an AppImage can't
    // change, rather than always, as the legacy one did.
    toolsets: { appimage: '1.0.3' },
    deb: {
      packageName: 'learnx',
      // AppImages update themselves; a .deb is updated by installing the
      // next one.
      artifactName: 'learnX-${version}-${arch}.${ext}',
    },
  };
};

/**
 * Why installers can't be built yet, or null: while the committed update key
 * (certs/electron-update.pem) is still the placeholder, nobody can sign an
 * update those installs would take, so they could never update. An unpacked
 * build (`--dir`), a test build for a local update server (`--update-url`)
 * and a build that says so (`--allow-placeholder-key`) may go ahead.
 *
 * @param {{ dir?: boolean; updateUrl?: string; allowPlaceholderKey?: boolean }} options
 * @param {string | Buffer} publicKey the committed key
 * @returns {string | null}
 */
const placeholderKeyProblem = (options, publicKey) =>
  isPlaceholderKey(publicKey) &&
  !options.dir &&
  !options.updateUrl &&
  !options.allowPlaceholderKey
    ? 'certs/electron-update.pem is still the placeholder, so these installs could never update: make the key first (electron/AGENTS.md, "Signing updates"), or pass --allow-placeholder-key for a build that will never be released'
    : null;

module.exports = { packageConfig: config, placeholderKeyProblem };
