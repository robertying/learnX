const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// Expo's config, which `expo export` (over-the-air updates) and `expo
// export:embed` (the bundle in release builds) need.
const { getDefaultConfig } = require('expo/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

// babel/inline-env.js inlines .env and babel-plugin-preval inlines the files
// in src/helpers/preval at transform time, and Metro's cache only tracks the
// file being transformed. Hashing them into the cache version makes a change
// take effect on the next Metro start, without --reset-cache.
const inlinedInputsHash = () => {
  const prevalDir = path.join(__dirname, 'src/helpers/preval');
  const files = [
    path.join(__dirname, '.env'),
    ...fs
      .readdirSync(prevalDir)
      .sort()
      .map(name => path.join(prevalDir, name)),
  ];
  const hash = crypto.createHash('sha256');
  // babel/inline-env.js reads it too (E2E builds).
  hash.update(`TEST_LOGIN=${process.env.TEST_LOGIN ?? ''}`);
  for (const file of files) {
    hash.update(file);
    hash.update(fs.existsSync(file) ? fs.readFileSync(file) : '');
  }
  return hash.digest('hex').slice(0, 16);
};

const defaultConfig = getDefaultConfig(__dirname);

// What Metro crawls and watches. Without Watchman (`react-native start` falls
// back to its own crawler and file watcher) it reads every folder under the
// project root it isn't told to skip, and warns about each one that vanishes
// while it reads it: agent worktrees under .claude being installed, Pods and
// Gradle outputs being rebuilt, lock folders build scripts create and remove.
// So only the folders that hold code the app bundles are watched; files at the
// top level (index.js, package.json, app.json) stay, since the app imports
// them. Metro tests these patterns against absolute paths while crawling and
// against paths relative to the project root while watching, so each takes
// either form. With Watchman installed, .watchmanconfig skips the same
// top-level folders.
const escape = (/** @type {string} */ text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const appFolders = ['src', 'modules', 'node_modules'];
const otherTopLevelFolders = new RegExp(
  `^(?:${escape(__dirname)}[\\\\/]|(?![\\\\/]|[A-Za-z]:))` +
    `(?!(?:${appFolders.join('|')})(?:[\\\\/]|$))[^\\\\/]+[\\\\/]`,
);
// Native build outputs inside the local modules and installed packages.
const nativeBuildOutputs =
  /[\\/](?:android|ios)[\\/](?:build|\.cxx|\.gradle|\.kotlin|Pods)(?:[\\/]|$)/;

/** @type {ReturnType<typeof getDefaultConfig>} */
const config = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    blockList: [
      defaultConfig.resolver.blockList ?? [],
      otherTopLevelFolders,
      nativeBuildOutputs,
    ].flat(),
  },
  cacheVersion: inlinedInputsHash(),
};

module.exports = wrapWithReanimatedMetroConfig(
  // @ts-expect-error -- Expo types the config with its own copy of Metro's
  // types (@expo/metro), Reanimated with metro-config's; they differ only in
  // readonly-ness.
  config,
);
