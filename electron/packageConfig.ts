// electron-builder's config for Windows and Linux, which package.ts
// (`pnpm electron:package`) passes it after exporting the web build. Not
// named electron-builder.config.*, which electron-builder would also load
// itself. Builds are unsigned, and never for macOS, which has the Mac
// Catalyst app. Installers go to build/electron/dist.
import fs from 'node:fs';
import path from 'node:path';
import type { Configuration } from 'electron-builder';
import updateMirror from '../src/constants/updateMirror.json' with { type: 'json' };
import { readBuildInfo } from './buildInfo.ts';
import { PRELOADS } from './preloads.ts';
import { SHARED_FILES } from './shared.ts';
import { isPlaceholderKey } from './updateSignature.ts';

const electronDir = import.meta.dirname;
const { version, build } = readBuildInfo(path.join(electronDir, '..'));

/**
 * The main process's files: main.ts and what it imports, file by file. Only
 * these are packaged, so the dev runner, the packaging scripts and the tests
 * next to them stay out.
 */
export const mainProcessFiles = (entry = 'main.ts'): string[] => {
  const found = new Set<string>();
  const visit = (name: string) => {
    if (found.has(name)) {
      return;
    }
    found.add(name);
    const source = fs.readFileSync(path.join(electronDir, name), 'utf8');
    for (const [, imported] of source.matchAll(/\bfrom '\.\/([\w.-]+\.ts)'/g)) {
      visit(imported);
    }
  };
  visit(entry);
  return [...found].sort();
};

/** What a build may differ in from a release's (package.ts). */
export interface PackageOptions {
  /** The version and build number, the checkout's unless a test build sets them. */
  version?: string;
  build?: string;
  /** A test server standing in for the mirror (updateServer.ts). */
  updateUrl?: string;
  /**
   * A folder with a test build's own electron-public-key.pem, in place of
   * certs/: the key the build trusts update files signed by (updateE2E.ts).
   */
  updateKeyDir?: string;
  /** Where the installers go, instead of build/electron/dist. */
  output?: string;
  /** One CPU architecture's installers instead of both. */
  arch?: 'x64' | 'arm64';
}

export const packageConfig = (options: PackageOptions = {}): Configuration => {
  const appVersion = options.version ?? version;
  const buildNumber = options.build ?? build;
  const updateUrl = options.updateUrl ?? `${updateMirror.latestRelease}/`;
  const arch: ('x64' | 'arm64')[] = options.arch
    ? [options.arch]
    : ['x64', 'arm64'];
  return {
    appId: 'io.robertying.learnXElectron',
    productName: 'learnX',
    copyright: `Copyright © ${new Date().getFullYear()} Rui Ying`,
    // Written into the packaged app's package.json: the version and the build
    // number (main.ts, Settings › About). The description is what Windows
    // shows as the file's (Task Manager), with the author as its company.
    extraMetadata: {
      version: appVersion,
      buildNumber,
      // Where updates come from, as app-update.yml has it (`publish`), for
      // the provider that checks their signature (updater.ts).
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
    directories: {
      output: options.output ?? '../build/electron/dist',
      buildResources: 'icons',
    },
    // Fuses flipped in the packaged Electron binary: it never runs as plain
    // Node (`ELECTRON_RUN_AS_NODE`), takes no code from `NODE_OPTIONS`, and
    // gives `file://` pages no extra privileges, since the app serves itself
    // from `app://` (appOrigin.ts). `--inspect` stays: the packaged E2E
    // tests launch through it (Playwright's `electron.launch`).
    electronFuses: {
      runAsNode: false,
      enableNodeOptionsEnvironmentVariable: false,
      grantFileProtocolExtraPrivileges: false,
    },
    // Electron's downloads for each platform, kept with the dev runner's.
    electronDownload: {
      cache: path.join(electronDir, '..', 'build', 'electron', 'cache'),
    },
    files: [
      // Run as TypeScript: Electron's Node strips the types as it loads them.
      ...mainProcessFiles(),
      'icons/icon.png',
      'icons/icon.ico',
      // The main process's packages ship source maps (js-yaml's are 0.55 MB)
      // that nothing in the app reads.
      '!**/node_modules/**/*.map',
      { from: '../build/electron/web', to: 'web' },
      // The preloads, stripped of their types (preloads.ts, package.ts).
      {
        from: '../build/electron/preloads',
        to: '.',
        filter: PRELOADS.map(({ output }) => output),
      },
      // What the main process shares with the page (shared.ts).
      {
        from: '../src/constants',
        to: 'constants',
        filter: [...SHARED_FILES],
      },
      // The key update files are signed with (updateSignature.ts).
      {
        from: options.updateKeyDir ?? '../certs',
        to: '.',
        filter: ['electron-public-key.pem'],
      },
    ],
    // Where the packaged app finds updates (app-update.yml): the TUNA
    // mirror's copy of the latest GitHub release (`v<version>`, with the
    // mobile and desktop builds of a version), as the Android app's updater
    // reads it (src/services/updateFeed.ts). Also makes electron-builder write
    // the update files (latest.yml, latest-linux.yml,
    // latest-linux-arm64.yml); nothing is published from here.
    publish: { provider: 'generic', url: updateUrl },
    win: {
      // One installer for both: Windows installs the one for its CPU.
      target: [{ target: 'nsis', arch }],
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
      artifactName: 'learnX-windows-v${version}.${ext}',
    },
    linux: {
      target: [
        { target: 'AppImage', arch },
        { target: 'deb', arch },
      ],
      icon: 'icons/icon.png',
      executableName: 'learnx',
      // learnX-<target>-v<version>, as the Android APKs are named. ${arch} is
      // x86_64 in an AppImage's name and amd64 in a .deb's (electron-builder).
      artifactName: 'learnX-linux-${arch}-v${version}.${ext}',
      category: 'Education',
      synopsis: 'Tsinghua Web Learning',
      description: 'learnX for Tsinghua Web Learning.',
      maintainer: 'Rui Ying <learnX@ruiying.io>',
      vendor: 'Rui Ying',
      // learnx.desktop, with StartupWMClass learnx: the window's class
      // (desktopName above).
      syncDesktopName: true,
      desktop: {
        entry: {
          Name: 'learnX',
          Comment: 'Tsinghua Web Learning',
          // Shown in the app grid; most people use the system in Chinese.
          'Comment[zh_CN]': '清华大学网络学堂',
        },
      },
    },
    // The AppImage's runtime: the static one (type2-runtime), which needs
    // neither libfuse2 (gone from Ubuntu since 22.04) nor libz.so (only in
    // zlib1g-dev, which the legacy arm64 runtime links against). Its AppRun
    // drops Chromium's sandbox only where the system blocks unprivileged
    // user namespaces (Ubuntu 24.04 and later), which an AppImage can't
    // change, rather than always, as the legacy one did.
    // NSIS: the 3.12 bundle, which has a makensis for Apple silicon (the
    // legacy 3.0.4.1 one is Intel-only), so a Mac packages both platforms
    // without Rosetta. Every tool these toolsets and the .deb's fpm bring has
    // an arm64 macOS build.
    toolsets: { appimage: '1.0.3', nsis: '1.2.1' },
    deb: { packageName: 'learnx' },
  };
};

/** Whether `url` is an update server on this computer (updateServer.ts). */
const isLocalUrl = (url: string | undefined) => {
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(url ?? '').hostname);
  } catch {
    return false;
  }
};

/**
 * Why a build can't trust another update key than the committed one, or
 * null: only a test build for an update server on this computer may, so a
 * build that trusts a throwaway key can never pass for a release.
 */
export const testKeyProblem = (options: {
  updateUrl?: string;
  updatePublicKey?: string;
}): string | null =>
  options.updatePublicKey && !isLocalUrl(options.updateUrl)
    ? '--update-public-key is for a test build only: pass an --update-url on localhost or 127.0.0.1 too'
    : null;

/**
 * Why installers can't be built, or null: if the committed update key
 * (certs/electron-public-key.pem) is a placeholder, nobody can sign an update
 * those installs would take, so they could never update. An unpacked
 * build (`--dir`), a test build for an update server on this computer
 * (`--update-url` on localhost or 127.0.0.1: any other could pass for a
 * release) and a build that says so (`--allow-placeholder-key`) may go ahead.
 * @param publicKey the committed key
 */
export const placeholderKeyProblem = (
  options: { dir?: boolean; updateUrl?: string; allowPlaceholderKey?: boolean },
  publicKey: string | Buffer,
): string | null =>
  isPlaceholderKey(publicKey) &&
  !options.dir &&
  !isLocalUrl(options.updateUrl) &&
  !options.allowPlaceholderKey
    ? 'certs/electron-public-key.pem is a placeholder, so these installs could never update: commit the update key\'s public half (electron/AGENTS.md, "Packaging and updates"), or pass --allow-placeholder-key for a build that will never be released'
    : null;
