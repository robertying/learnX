// The app's version and build number, which the Electron app shares with
// the mobile apps: the version is package.json's, and the build number is the
// Xcode project's CURRENT_PROJECT_VERSION, which `pnpm bump` keeps (as
// fastlane's `build_number` reads it).
const fs = require('node:fs');
const path = require('node:path');

/** The build number in an Xcode project's text; throws if it's not one. */
const buildNumberOf = (/** @type {string} */ pbxproj) => {
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
  return /** @type {string} */ ([...numbers][0]);
};

/** The version and build number of the checkout at `root`. */
const readBuildInfo = (/** @type {string} */ root) => ({
  version: /** @type {string} */ (
    JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version
  ),
  build: buildNumberOf(
    fs.readFileSync(
      path.join(root, 'ios', 'learnX.xcodeproj', 'project.pbxproj'),
      'utf8',
    ),
  ),
});

/**
 * The About panel's options (`app.setAboutPanelOptions`): the version, build
 * number and the Experimental label, in the system's language.
 *
 * @param {{ version: string; build: string }} info
 * @param {string} locale `app.getLocale()`
 * @param {string} iconPath
 */
const aboutPanelOptions = ({ version, build }, locale, iconPath) => {
  // The main process has no translations; this is its one label.
  const experimental = locale.startsWith('zh') ? '实验版' : 'Experimental';
  return {
    applicationName: 'learnX',
    applicationVersion: `${version} (${build}) · ${experimental}`,
    copyright: `© ${new Date().getFullYear()} Rui Ying`,
    website: 'https://github.com/robertying/learnX',
    iconPath,
  };
};

module.exports = { aboutPanelOptions, buildNumberOf, readBuildInfo };
