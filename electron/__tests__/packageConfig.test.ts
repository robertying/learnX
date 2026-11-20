import fs from 'node:fs';
import { createPublicKey } from 'node:crypto';
import path from 'node:path';
import updateMirror from '../../src/constants/updateMirror.json';
import electronPackage from '../package.json';
import {
  mainProcessFiles,
  packageConfig,
  placeholderKeyProblem,
  testKeyProblem,
} from '../packageConfig.ts';
import { SHARED_FILES, readShared } from '../shared.ts';

it('updates from the TUNA mirror, as the Android app does', () => {
  expect(packageConfig().publish).toEqual({
    provider: 'generic',
    url: `${updateMirror.latestRelease}/`,
  });
  expect(updateMirror.latestRelease).toBe(
    'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease',
  );
  expect(
    packageConfig({ updateUrl: 'http://localhost:8299/' }).publish,
  ).toEqual({ provider: 'generic', url: 'http://localhost:8299/' });
});

// GitHub turns spaces in a release asset's name into dots, which would break
// the links in latest.yml; electron-builder's defaults have spaces
// ("learnX Setup 19.0.0.exe").
it('names every file it uploads without spaces', () => {
  const config = packageConfig({ version: '19.0.0', build: '4544' });
  const names = [
    config.nsis?.artifactName,
    config.linux?.artifactName,
    config.win?.executableName,
    config.linux?.executableName,
  ];
  for (const name of names) {
    expect(name).toBeDefined();
    expect(name).not.toMatch(/\s/);
  }
});

// The packaged E2E tests launch the app with --inspect (Playwright).
it('turns off the fuses the app has no use for, and keeps --inspect', () => {
  expect(packageConfig().electronFuses).toEqual({
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    grantFileProtocolExtraPrivileges: false,
  });
});

it('writes the update files under their default names', () => {
  // A channel or detectUpdateChannel would rename latest*.yml.
  const config = packageConfig();
  expect(config.detectUpdateChannel).toBeUndefined();
  expect(config.generateUpdatesFilesForAllChannels).toBeUndefined();
  expect(config.publish).not.toHaveProperty('channel');
});

it('ships the update key’s public half, and where updates come from', () => {
  expect(packageConfig().files).toContainEqual({
    from: '../certs',
    to: '.',
    filter: ['electron-public-key.pem'],
  });
  expect(packageConfig().extraMetadata).toMatchObject({
    updateUrl: `${updateMirror.latestRelease}/`,
  });
  expect(
    packageConfig({ updateUrl: 'http://localhost:8299/' }).extraMetadata,
  ).toMatchObject({ updateUrl: 'http://localhost:8299/' });
});

it('ships a test build’s own update key in place of the committed one', () => {
  const config = packageConfig({
    updateUrl: 'http://127.0.0.1:8299/',
    updateKeyDir: '/tmp/test-update-key',
  });
  expect(config.files).toContainEqual({
    from: '/tmp/test-update-key',
    to: '.',
    filter: ['electron-public-key.pem'],
  });
  expect(config.files).not.toContainEqual(
    expect.objectContaining({ from: '../certs' }),
  );
});

it('builds both CPU architectures, or the one asked for', () => {
  const targets = (config: ReturnType<typeof packageConfig>) => [
    config.win?.target,
    config.linux?.target,
  ];
  expect(targets(packageConfig())).toEqual([
    [{ target: 'nsis', arch: ['x64', 'arm64'] }],
    [
      { target: 'AppImage', arch: ['x64', 'arm64'] },
      { target: 'deb', arch: ['x64', 'arm64'] },
    ],
  ]);
  expect(targets(packageConfig({ arch: 'arm64' }))).toEqual([
    [{ target: 'nsis', arch: ['arm64'] }],
    [
      { target: 'AppImage', arch: ['arm64'] },
      { target: 'deb', arch: ['arm64'] },
    ],
  ]);
});

it('builds into build/electron/dist, or where asked', () => {
  expect(packageConfig().directories?.output).toBe('../build/electron/dist');
  expect(packageConfig({ output: '/tmp/out' }).directories?.output).toBe(
    '/tmp/out',
  );
});

describe('testKeyProblem', () => {
  it('lets a test build for a local server trust its own key', () => {
    for (const updateUrl of [
      'http://localhost:8299/',
      'http://127.0.0.1:8299/',
    ]) {
      expect(
        testKeyProblem({ updateUrl, updatePublicKey: 'key.pem' }),
      ).toBeNull();
    }
    expect(testKeyProblem({})).toBeNull();
  });

  it.each([
    undefined,
    'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/',
    'http://localhost.example.com/',
  ])(
    'refuses another key for %s, which could pass for a release',
    updateUrl => {
      expect(testKeyProblem({ updateUrl, updatePublicKey: 'key.pem' })).toMatch(
        /test build only/,
      );
    },
  );
});

it('gives the .deb the homepage it requires', () => {
  expect(packageConfig().extraMetadata).toMatchObject({
    homepage: 'https://github.com/robertying/learnX',
  });
});

it("carries the checkout's version and build number", () => {
  const config = packageConfig({ version: '19.0.1', build: '4550' });
  expect(config.extraMetadata).toMatchObject({
    version: '19.0.1',
    buildNumber: '4550',
  });
  expect(config.buildVersion).toBe('19.0.1.4550');
});

it('installs for the current user, and uninstalling removes learnX’s data', () => {
  const { nsis } = packageConfig();
  expect(nsis).toMatchObject({
    oneClick: false,
    perMachine: false,
    include: 'installer.nsh',
    deleteAppDataOnUninstall: true,
  });
  const script = fs.readFileSync(
    path.join(__dirname, '..', 'installer.nsh'),
    'utf8',
  );
  expect(script).toContain('StrCpy $isForceCurrentInstall "1"');
  // Start at login's Run entry is named after the app id (main.ts), and
  // electron-updater's cache after the package's name.
  const appId = packageConfig().appId!;
  expect(script).toContain(
    `DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "${appId}"`,
  );
  expect(
    fs.readFileSync(path.join(__dirname, '..', 'main.ts'), 'utf8'),
  ).toContain(`const APP_ID = '${appId}';`);
  expect(script).toContain('RMDir /r "$LOCALAPPDATA\\learnX"');
  expect(script).toContain(
    `RMDir /r "$LOCALAPPDATA\\${electronPackage.name}-updater"`,
  );
});

it('packages what the main process shares with the page', () => {
  expect(packageConfig().files).toContainEqual({
    from: '../src/constants',
    to: 'constants',
    filter: SHARED_FILES,
  });
  for (const name of SHARED_FILES) {
    expect(readShared(name)).toEqual(
      JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../../src/constants', name),
          'utf8',
        ),
      ),
    );
  }
  expect(() => readShared('updateMirror.json' as never)).toThrow(
    'Not a shared file',
  );
  // Nothing in the main process reads src/ any other way.
  const readingSrc = mainProcessFiles().filter(name =>
    /from '\.\.\/src\//.test(
      fs.readFileSync(path.join(__dirname, '..', name), 'utf8'),
    ),
  );
  expect(readingSrc).toEqual([]);
});

it('packages the main process: main.ts and what it imports, nothing else', () => {
  const files = mainProcessFiles();
  expect(files).toEqual(
    expect.arrayContaining(['main.ts', 'preloads.ts', 'system.ts', 'net.ts']),
  );
  // Dev runs, packaging and tests only.
  for (const name of [
    'dev.ts',
    'clean.ts',
    'electronApp.ts',
    'macDevApp.ts',
    'package.ts',
    'packageConfig.ts',
    'updateServer.ts',
    'webExport.ts',
  ]) {
    expect(files).not.toContain(name);
  }
  expect(packageConfig().files).toEqual(expect.arrayContaining(files));
  // The preloads go as JavaScript (preloads.ts).
  expect(packageConfig().files).toContainEqual({
    from: '../build/electron/preloads',
    to: '.',
    filter: ['preload.cjs', 'webviewPreload.cjs'],
  });
});

describe('placeholderKeyProblem', () => {
  const placeholder = `PLACEHOLDER: not learnX's key.\n-----BEGIN PUBLIC KEY-----\n`;
  const real = '-----BEGIN PUBLIC KEY-----\n';

  it('refuses installers while the update key is the placeholder', () => {
    expect(placeholderKeyProblem({}, placeholder)).toMatch(/is a placeholder/);
    expect(placeholderKeyProblem({}, real)).toBeNull();
  });

  it.each([
    { dir: true },
    { updateUrl: 'http://localhost:8299/' },
    { updateUrl: 'http://127.0.0.1:8299/' },
    { allowPlaceholderKey: true },
  ])('lets %j through, as no release', options => {
    expect(placeholderKeyProblem(options, placeholder)).toBeNull();
  });

  it.each([
    'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/',
    'http://localhost.example.com/',
    'not a url',
  ])('refuses a test build for %s, which could pass for a release', url => {
    expect(placeholderKeyProblem({ updateUrl: url }, placeholder)).toMatch(
      /is a placeholder/,
    );
  });

  it('takes the committed key, a real Ed25519 public key', () => {
    const committed = fs.readFileSync(
      path.join(__dirname, '../../certs/electron-public-key.pem'),
      'utf8',
    );
    expect(placeholderKeyProblem({}, committed)).toBeNull();
    expect(createPublicKey(committed).asymmetricKeyType).toBe('ed25519');
  });
});

it('pins an AppImage runtime electron-builder still knows', () => {
  // A beta toolset (the static type2 runtime, no libfuse2 or libz.so on the
  // system): an electron-builder upgrade could drop it.
  const { appimageChecksums } = require(
    require.resolve('app-builder-lib/out/toolsets/linux', {
      paths: [path.join(__dirname, '..')],
    }),
  ) as { appimageChecksums: Record<string, unknown> };
  const version = packageConfig().toolsets?.appimage;
  expect(version).toBeDefined();
  expect(Object.keys(appimageChecksums)).toContain(version);
});

it('pins an NSIS toolset electron-builder still knows', () => {
  // The legacy toolset's makensis runs on an Apple silicon Mac only with
  // Rosetta; an electron-builder upgrade could drop this one.
  const { nsisChecksums } = require(
    require.resolve('app-builder-lib/out/toolsets/windows', {
      paths: [path.join(__dirname, '..')],
    }),
  ) as { nsisChecksums: Record<string, unknown> };
  const version = packageConfig().toolsets?.nsis;
  expect(version).toBeDefined();
  expect(version).not.toBe('0.0.0');
  expect(Object.keys(nsisChecksums)).toContain(version);
});
