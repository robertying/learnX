// What counts as native code for the over-the-air runtime version check
// (scripts/checks/check-ota-runtime.mjs, `npx expo-updates fingerprint:generate`):
// Expo's "balanced" preset, minus what can't make an older build's native
// code unable to run new JS. app.json only holds the update settings in this
// bare app, the package.json scripts and .gitignore don't reach the app, and
// Expo.plist's update settings are written by every build anyway.

const { execFileSync } = require('child_process');

// The version and build number change with every `pnpm bump` and don't make
// a build's native code any different to the JS it runs, so these lines of
// the files that hold them don't count: a release that changes only JS keeps
// the runtime version, which is set in app.json, not taken from the app's
// version.
const versionLines = {
  'ios/learnX.xcodeproj/project.pbxproj':
    /^\s*(?:CURRENT_PROJECT_VERSION = \d+|MARKETING_VERSION = [\d.]+);\n/gm,
  'android/app/build.gradle':
    /^\s*(?:versionCode = \d+|versionName = "[\d.]+")\n/gm,
};

// Files come in chunks, so the files above are held until their end.
const held = new Map();

/** @type {import('@expo/fingerprint').FileHookTransformFunction} */
const fileHookTransform = (source, chunk, isEndOfFile, encoding) => {
  const pattern = source.type === 'file' && versionLines[source.filePath];
  if (!pattern) {
    return chunk;
  }
  const { filePath } = source;
  const chunks = held.get(filePath) ?? [];
  if (chunk !== null) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
  }
  if (!isEndOfFile) {
    held.set(filePath, chunks);
    return null;
  }
  held.delete(filePath);
  return Buffer.concat(chunks).toString('utf8').replace(pattern, '');
};

/**
 * Git-ignored files in the native folders: what Xcode, Android Studio, a build
 * or Finder leave in a checkout (xcuserdata, .idea, Pods, build outputs,
 * .DS_Store), which CI's clean checkout doesn't have, so a local check
 * matches CI's. Native packages under node_modules (also git-ignored) still
 * count.
 */
const gitIgnored = () => {
  let listed;
  try {
    listed = execFileSync(
      'git',
      [
        'ls-files',
        '--others',
        '--ignored',
        '--exclude-standard',
        '--directory',
        '-z',
        '--',
        'ios',
        'android',
        'modules',
      ],
      { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    // Not a Git checkout
    return [];
  }
  return (
    listed
      .split('\0')
      .filter(Boolean)
      // As glob patterns, matching a folder's files
      .map(file => file.replace(/[[\]{}()*?!+@]/g, '\\$&'))
      .map(file => (file.endsWith('/') ? `${file}**/*` : file))
  );
};

/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  fileHookTransform,
  // The persisted stores' versions count as native: a store without a
  // `migrate` that finds a newer version than its code knows starts from its
  // defaults, and expo-updates can go back to an older bundle (a rollback, or
  // after an update that crashed at launch). Bumping one so needs a new
  // runtime version, and no bundle of the same build reads the newer shape.
  extraSources: [
    {
      type: 'file',
      filePath: 'src/data/storeVersions.json',
      reasons: ['persistedStoreVersions'],
    },
  ],
  sourceSkips: [
    'PackageJsonAndroidAndIosScriptsIfNotContainRun',
    'EasJson',
    'Easignore',
    'AutolinkingConfigPaths',
    'ExpoConfigAll',
    'PackageJsonScriptsAll',
    'GitIgnore',
  ],
  ignorePaths: [
    'ios/learnX/Expo.plist',
    // Native tests don't ship, nor do the patches' notes and tests.
    'patches/README.md',
    'patches/__tests__/**/*',
    'ios/learnXTests/**/*',
    'ios/learnXUITests/**/*',
    'modules/*/ios/Tests/**/*',
    'modules/*/android/src/test/**/*',
    'android/app/src/test/**/*',
    'android/patch-tests/**/*',
    ...gitIgnored(),
  ],
};
