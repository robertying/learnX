import updateMirror from '../../src/constants/updateMirror.json';
import { packageConfig } from '../packageConfig.cjs';

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

it("carries the checkout's version and build number", () => {
  const config = packageConfig({ version: '19.0.1', build: '4550' });
  expect(config.extraMetadata).toMatchObject({
    version: '19.0.1',
    buildNumber: '4550',
  });
  expect(config.buildVersion).toBe('19.0.1.4550');
});
