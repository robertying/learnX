// What counts as native code for the over-the-air runtime version check
// (scripts/check-ota-runtime.mjs, `npx expo-updates fingerprint:generate`):
// Expo's "balanced" preset, minus what can't make an older build's native
// code unable to run new JS. app.json only holds the update settings in this
// bare app, the package.json scripts and .gitignore don't reach the app, and
// Expo.plist's update settings are written by every build anyway.
/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  sourceSkips: [
    'PackageJsonAndroidAndIosScriptsIfNotContainRun',
    'EasJson',
    'Easignore',
    'AutolinkingConfigPaths',
    'ExpoConfigAll',
    'PackageJsonScriptsAll',
    'GitIgnore',
  ],
  // Git-ignored files a local build or setup leaves behind, so a local check
  // matches CI's clean checkout.
  ignorePaths: [
    'ios/learnX/Expo.plist',
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
