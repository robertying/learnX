const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) =>
      context.resolveRequest(
        // cheerio's Node entry (which thu-learn-lib gets) loads undici and
        // node:stream for `fromURL`; its browser build is the same parser
        // without them.
        moduleName === 'cheerio'
          ? {
              ...context,
              unstable_conditionNames: [
                'browser',
                ...context.unstable_conditionNames,
              ],
            }
          : context,
        moduleName,
        platform,
      ),
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(defaultConfig, config),
);
