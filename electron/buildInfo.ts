// The app's version and build number, which the Electron app shares with
// the mobile apps: the version is package.json's, and the build number is the
// Xcode project's CURRENT_PROJECT_VERSION. That's the committed one, which
// only local builds get: a release build passes its own (`--build`), which is
// never committed.
import fs from 'node:fs';
import path from 'node:path';

export type BuildInfo = { version: string; build: string };

/** The build number in an Xcode project's text; throws if it's not one. */
export const buildNumberOf = (pbxproj: string): string => {
  const numbers = new Set(
    Array.from(
      pbxproj.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g),
      match => match[1],
    ),
  );
  if (numbers.size !== 1) {
    throw new Error(
      `Expected one CURRENT_PROJECT_VERSION, found ${numbers.size ? [...numbers].join(', ') : 'none'}`,
    );
  }
  return [...numbers][0];
};

/** The version and build number of the checkout at `root`. */
export const readBuildInfo = (root: string): BuildInfo => ({
  version: (
    JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      version: string;
    }
  ).version,
  build: buildNumberOf(
    fs.readFileSync(
      path.join(root, 'ios', 'learnX.xcodeproj', 'project.pbxproj'),
      'utf8',
    ),
  ),
});

/**
 * The About panel's options (`app.setAboutPanelOptions`): the version and
 * build number, as Settings › About shows them. macOS's panel adds the build
 * version in brackets itself (`version`; without one it shows the bundle's,
 * which in the dev app is Electron.app's), so there the build number goes
 * there; Windows and Linux show `applicationVersion` alone.
 */
export const aboutPanelOptions = (
  { version, build }: BuildInfo,
  iconPath: string,
  platform: string = process.platform,
): Electron.AboutPanelOptionsOptions => ({
  applicationName: 'learnX',
  ...(platform === 'darwin'
    ? { applicationVersion: version, version: build }
    : { applicationVersion: `${version} (${build})` }),
  copyright: `© ${new Date().getFullYear()} Rui Ying`,
  website: 'https://github.com/robertying/learnX',
  iconPath,
});
