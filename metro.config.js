const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const envHash = () => {
  const file = path.join(__dirname, '.env');
  return fs.existsSync(file)
    ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : 'no-env';
};

/**
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  // babel/inline-env.js inlines .env, which Metro doesn't track. Keying the
  // transform cache on it means a changed .env takes effect on the next Metro
  // start, without --reset-cache.
  cacheVersion: envHash(),
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(__dirname), config),
);
