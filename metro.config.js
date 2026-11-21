const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// Expo's config, which `expo export` (over-the-air updates) and `expo
// export:embed` (the bundle in release builds) need.
const { getDefaultConfig } = require('expo/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

// Expo's tree shaking (and the graph optimization it needs) for production
// bundles: release builds, updates and the Electron app's web build. Metro
// otherwise bundles every export of every module a file imports: all of
// Fluent UI through its index, every size of each Fluent icon, the encode
// tables of entities that only decoding is imported from. Development
// bundles aren't optimized either way. The CLI reads these when it starts
// Metro, after loading this file. Metro's workers need
// patches/babel-plugin-react-compiler to send the ASTs back.
process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH = '1';
process.env.EXPO_UNSTABLE_TREE_SHAKING = '1';

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

// What Metro crawls and watches. Metro uses its own crawler and file watcher,
// never Watchman (`useWatchman` below), so it reads every folder under the
// project root it isn't told to skip, and warns about each one that vanishes
// while it reads it: agent worktrees under .claude being installed, Pods and
// Gradle outputs being rebuilt, lock folders build scripts create and remove.
// So only the folders that hold code the app bundles are watched; files at the
// top level (index.js, package.json, app.json) stay, since the app imports
// them. Metro tests these patterns against absolute paths while crawling and
// against paths relative to the project root while watching, so each takes
// either form. The Electron app's logo (`components/Logo.web.tsx`) is its icon
// in electron/icons, the one folder of electron/ the web build reads.
const escape = (/** @type {string} */ text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const appFolders = ['src', 'modules', 'node_modules', 'electron[\\\\/]icons'];
const otherTopLevelFolders = new RegExp(
  `^(?:${escape(__dirname)}[\\\\/]|(?![\\\\/]|[A-Za-z]:))` +
    `(?!(?:${appFolders.join('|')})(?:[\\\\/]|$))[^\\\\/]+[\\\\/]`,
);
// Native build outputs inside the local modules and installed packages.
const nativeBuildOutputs =
  /[\\/](?:android|ios)[\\/](?:build|\.cxx|\.gradle|\.kotlin|Pods)(?:[\\/]|$)/;
// Tools' caches (Jest's, jest.config.js), thousands of files Metro would
// otherwise crawl.
const toolCaches = /[\\/]node_modules[\\/]\.cache[\\/]/;

/** @type {ReturnType<typeof getDefaultConfig>} */
const config = {
  ...defaultConfig,
  cacheVersion: inlinedInputsHash(),
  resolver: {
    ...defaultConfig.resolver,
    // Watchman serves a checkout inside another watched one (a git worktree
    // under .claude/worktrees) from the outer watch, where that folder is
    // ignored, so Metro would find no files there. Metro's own crawler is
    // about as fast here.
    useWatchman: false,
    blockList: [
      defaultConfig.resolver.blockList ?? [],
      otherTopLevelFolders,
      nativeBuildOutputs,
      toolCaches,
    ].flat(),
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
