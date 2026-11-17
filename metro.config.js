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
// file being transformed, not the repo's own Babel plugins (babel/) either.
// Hashing them all into the cache version makes a change take effect on the
// next Metro start, without --reset-cache.
const inlinedInputsHash = () => {
  const folderFiles = (/** @type {string} */ dir) =>
    fs
      .readdirSync(path.join(__dirname, dir))
      .sort()
      .map(name => path.join(__dirname, dir, name));
  const files = [
    path.join(__dirname, '.env'),
    ...folderFiles('src/helpers/preval'),
    ...folderFiles('babel'),
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

// The Electron app (a web build): packages with no web build, or one that
// can't run there, resolve to the stand-ins in src/web that aliases.json
// names. Every other module, and every other platform, resolves as usual.
/** @type {Record<string, string>} */
const webAliases = require('./src/web/aliases.json');

const defaultConfig = getDefaultConfig(__dirname);
const upstreamResolveRequest = defaultConfig.resolver?.resolveRequest;

/** @type {ReturnType<typeof getDefaultConfig>} */
const config = {
  ...defaultConfig,
  cacheVersion: inlinedInputsHash(),
  resolver: {
    ...defaultConfig.resolver,
    resolveRequest: (context, moduleName, platform) => {
      const alias = platform === 'web' ? webAliases[moduleName] : undefined;
      if (alias) {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'src/web', alias),
        };
      }
      return upstreamResolveRequest
        ? upstreamResolveRequest(context, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  // @ts-expect-error -- Expo types the config with its own copy of Metro's
  // types (@expo/metro), Reanimated with metro-config's; they differ only in
  // readonly-ness.
  config,
);
