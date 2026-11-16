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

// .claude holds agent worktrees (each a full checkout with its own
// node_modules) and other local files, none of them app code. Without
// Watchman, Metro's crawler walks the whole project and warns about every
// folder a package install in a worktree moves while it reads it.
const claudeFolder = new RegExp(
  `^${path
    .join(__dirname, '.claude')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\\\/]|$)`,
);

/** @type {ReturnType<typeof getDefaultConfig>} */
const config = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    blockList: [defaultConfig.resolver.blockList ?? [], claudeFolder].flat(),
  },
  cacheVersion: inlinedInputsHash(),
};

module.exports = wrapWithReanimatedMetroConfig(
  // @ts-expect-error -- Expo types the config with its own copy of Metro's
  // types (@expo/metro), Reanimated with metro-config's; they differ only in
  // readonly-ness.
  config,
);
