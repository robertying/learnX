const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
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
  for (const file of files) {
    hash.update(file);
    hash.update(fs.existsSync(file) ? fs.readFileSync(file) : '');
  }
  return hash.digest('hex').slice(0, 16);
};

/**
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  cacheVersion: inlinedInputsHash(),
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config),
);
