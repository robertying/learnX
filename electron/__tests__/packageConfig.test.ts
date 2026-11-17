import fs from 'node:fs';
import path from 'node:path';
import updateMirror from '../../src/constants/updateMirror.json';
import electronPackage from '../package.json';
import { packageConfig } from '../packageConfig.cjs';
import { SHARED_FILES, readShared } from '../shared.cjs';

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
    config.deb?.artifactName,
    config.win?.executableName,
    config.linux?.executableName,
  ];
  for (const name of names) {
    expect(name).toBeDefined();
    expect(name).not.toMatch(/\s/);
  }
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
    filter: ['electron-update.pem'],
  });
  expect(packageConfig().extraMetadata).toMatchObject({
    updateUrl: `${updateMirror.latestRelease}/`,
  });
  expect(
    packageConfig({ updateUrl: 'http://localhost:8299/' }).extraMetadata,
  ).toMatchObject({ updateUrl: 'http://localhost:8299/' });
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
  // Start at login's Run entry is named after the app id (main.cjs), and
  // electron-updater's cache after the package's name.
  const appId = packageConfig().appId!;
  expect(script).toContain(
    `DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "${appId}"`,
  );
  expect(
    fs.readFileSync(path.join(__dirname, '..', 'main.cjs'), 'utf8'),
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
  const readingSrc = fs
    .readdirSync(path.join(__dirname, '..'))
    .filter(name => name.endsWith('.cjs') && name !== 'packageConfig.cjs')
    .filter(name =>
      fs
        .readFileSync(path.join(__dirname, '..', name), 'utf8')
        .includes("require('../src/"),
    );
  expect(readingSrc).toEqual([]);
});
