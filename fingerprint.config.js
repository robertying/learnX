// What counts as native code for the over-the-air runtime version check
// (scripts/check-ota-runtime.mjs, `npx expo-updates fingerprint:generate`):
// Expo's "balanced" preset, minus what can't make an older build's native
// code unable to run new JS. app.json only holds the update settings in this
// bare app, the package.json scripts and .gitignore don't reach the app, and
// Expo.plist's update settings are written by every build anyway.
/** @type {import('@expo/fingerprint').Config} */
module.exports = {
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
    // Native tests don't ship.
    'ios/learnXTests/**/*',
    'ios/learnXUITests/**/*',
    'modules/*/ios/Tests/**/*',
    'modules/*/android/src/test/**/*',
    'android/patch-tests/**/*',
    // Git-ignored files a local build or setup leaves behind, so a local check
    // matches CI's clean checkout.
    'ios/.xcode.env.local',
    'ios/build/**/*',
    'ios/Pods/**/*',
    'android/local.properties',
    'android/.gradle/**/*',
    'android/.kotlin/**/*',
    'android/build/**/*',
    'android/app/build/**/*',
    'android/app/.cxx/**/*',
    'android/app/release.keystore',
  ],
};
