#!/usr/bin/env node
// Fails if a phone's release bundle carries another platform's code: the
// Electron app's modules on either phone, or Android's Compose components in
// the iOS bundle. Each is required only in a branch for its platform, which
// Metro folds away in release builds (babel/inline-platform.js turns
// helpers/platform's checks into ones it can fold), so a marker here means
// an import that isn't in such a branch. scripts/checks/check-release-bundle.sh runs
// it on both bundles.
//
//   node scripts/checks/check-bundle-platform.mjs <ios|android> <bundle>
import { readFileSync } from 'node:fs';

/** Text only the modules that mustn't be there have, by what they are. */
export const MARKERS = {
  electron: [
    // web/bridge
    'Not running in the learnX Electron app',
    // theme/electron
    'buildElectronColors',
    'electronSystemColors',
    // services/calendar/electronExport
    'buildElectronICS',
    // services/files/electron
    'saveTextAs',
  ],
  // @expo/ui/jetpack-compose (Android's widget layouts and components).
  compose: ['"OutlinedTextField"', '"BasicAlertDialog"'],
};

/** What `platform`'s bundle must not contain. */
export const forbiddenIn = (/** @type {string} */ platform) =>
  platform === 'ios'
    ? [...MARKERS.electron, ...MARKERS.compose]
    : [...MARKERS.electron];

/** The forbidden markers found in a bundle's text. */
export const problems = (
  /** @type {string} */ platform,
  /** @type {string} */ bundle,
) => forbiddenIn(platform).filter(marker => bundle.includes(marker));

const main = () => {
  const [platform, file] = process.argv.slice(2);
  if (!platform || !file) {
    console.error('Usage: check-bundle-platform.mjs <ios|android> <bundle>');
    process.exit(1);
  }
  const found = problems(platform, readFileSync(file, 'utf8'));
  if (found.length > 0) {
    console.error(
      `${file} has another platform's code: ${found.join(', ')}. Require it only in a branch for its platform (isElectron() ? require(…) : …).`,
    );
    process.exit(1);
  }
  console.log(`No other platform's code in the ${platform} bundle`);
};

// Run as a script (Jest's transform leaves `import.meta` out).
if (process.argv[1]?.endsWith('check-bundle-platform.mjs')) {
  main();
}
