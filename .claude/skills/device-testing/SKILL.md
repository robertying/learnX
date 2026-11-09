---
name: device-testing
description: Build, run and check learnX on iOS simulators, Android emulators and Mac Catalyst on the shared Mac, with Metro, worktrees and disk cleanup. Use before building or launching the app, taking screenshots, or running Maestro flows.
---

# Device testing for learnX

Several sessions build and run learnX on the same Mac at once. Use only what you started: your own worktree, Metro port, simulator or emulator and Mac app, and stop them when you're done.

## Shared Mac

- Run your own Metro on a port no other session uses (`pnpm start --port <port>`) and point your app at it. Never stop another session's Metro, simulator, emulator or Gradle daemon: no `./gradlew --stop`, and no `xcrun simctl` command on `all` or a device you didn't take.
- Don't open React Native DevTools (no `j` in Metro, don't tap LogBox): read warnings and errors in the Metro log. `LogBox.ignoreAllLogs(true)` in `index.js` is deliberate.
- Debug builds don't send anything that changes a real account (submissions, favorites, course information sharing) until Settings › Allow Server Writes is on (`helpers/serverWrites.ts`; it resets on reload). Prefer the mock login (`src/data/AGENTS.md`), with Settings › Network Emulation for slow, failing or offline cases.
- A Mac Catalyst build shares its bundle id, sandbox, app group and keychain with any other copy of learnX on the Mac (including the installed release in `/Applications`). Quit other copies you started first, and quit yours by its PID, never with a broad `pkill`.

## iOS simulators

- Other sessions may be driving the stock simulators with other apps, so use the shared `learnX …` pool instead: `learnX iPhone 18 Pro`, `learnX iPhone 18 Pro 2`, `learnX iPad Pro 11` and `learnX iPhone Duo` (`simctl list devices | grep learnX`). Take one that is shut down; a booted one is probably another session's. Only when every device of the type you need is booted, create the next number (`xcrun simctl create "learnX iPhone 18 Pro 3" <device type> <runtime>`), and delete it (`xcrun simctl delete <udid>`) when you're done. Don't create per-task devices, and shut your device down when you finish.
- Read the app's defaults with `xcrun simctl spawn <udid> defaults read <data container>/Library/Preferences/io.robertying.learnX <key>`; the plist file on disk is written lazily and can be stale.
- Build with `xcodebuild -workspace ios/learnX.xcworkspace -scheme learnX -configuration Debug -destination 'id=<udid>'` (Mac Catalyst: `-destination 'platform=macOS,variant=Mac Catalyst'`); the app lands in `~/Library/Developer/Xcode/DerivedData/learnX-*/Build/Products/`. Always build signed, as Xcode does: never pass `CODE_SIGNING_ALLOWED=NO` (or `CODE_SIGN_IDENTITY=""`). An unsigned build has no entitlements, so the share extension can't reach the `group.io.robertying.learnX` app group (sharing to learnX opens the app with nothing shared) and the login is saved under the wrong keychain access group and lost on relaunch. Both look like app bugs but only happen in the unsigned build.
- Open in Chinese: `xcrun simctl launch <udid> io.robertying.learnX -AppleLanguages '(zh-Hans)' -AppleLocale zh_CN`.
- Sharing a file to learnX (Files or Photos › Share › learnX): the share extension (`ShareViewController` in the `react-native-share-menu` patch) copies the file into the app group and opens learnX. To get something to share, copy a file into `File Provider Storage` of the app group container whose metadata says `group.com.apple.FileProvider.LocalStorage` (Files › On My iPhone), or add a photo with `xcrun simctl addmedia`.
- Type the mock credentials with the simulator control tool's `text` action (tap the field first); use `pbcopy` + `xcrun simctl pbsync host <udid>` only for text it can't type. iPad and iPhone Duo can't be rotated/folded from the shell.

## Android emulators

- Start an AVD with `~/Library/Android/sdk/emulator/emulator -avd <name>` (`-list-avds`); adb is in `~/Library/Android/sdk/platform-tools`. Foldable AVDs have two displays: `adb exec-out screencap -d <display id> -p` (ids from `adb shell dumpsys SurfaceFlinger --display-id`; a wrong id gives a black frame, none gives warning text); `adb shell wm size` shows which one is active.
- Debug (`pnpm android`) and release (`pnpm android --mode release`) APKs are signed differently: if the other one is installed, `adb install` fails, so `adb uninstall io.robertying.learnx` first (or `adb install -r` for the same type).
- `adb shell input text` goes through Gboard and is flaky: pinyin composes ASCII into CJK and a leading character may double. Switch the keyboard to English (globe key) before typing and verify the field. Hide the keyboard with `keyevent 111`, not BACK (BACK exits the app).
- Chinese UI: `adb shell cmd locale set-app-locales io.robertying.learnx --locales zh-Hans`; light mode: `adb shell cmd uimode night no`.
- Odd resolutions: `adb shell wm size WxH; wm density D` (`wm size reset; wm density reset` afterwards); wait ~15 s for re-layout.
- Build only the emulator's ABI (`pnpm android --active-arch-only`, arm64-v8a on Apple silicon). Point the debug app at your Metro with `adb reverse tcp:<port> tcp:<port>` and the dev menu's debug server host (`localhost:<port>`); Maestro's `clearState` wipes that setting.

## Worktrees and disk space

- Several sessions work in worktrees under `.claude/worktrees/` at once. A new worktree's `node_modules` is an APFS clone of the main checkout's and costs almost nothing until something is built. What takes real space is what each worktree builds: Xcode DerivedData (one folder per workspace path, 4 to 20 GB, plus `ios/build` when built with `-derivedDataPath ios/build`), `android/app/{build,.cxx}`, and the Gradle outputs that native modules write inside `node_modules/*/android/{build,.cxx}` (about 5 GB).
- A cloned `node_modules` keeps the patches of the checkout it came from, and `pnpm install` says "up to date" without applying patches added since. `scripts/check-patches.sh` fails the iOS build ("Check patches" phase) and the Android one (`preBuild`) when a patch in `patches/` isn't applied; `pnpm install --force` reapplies them all.
- Reuse a worktree that already has the build you need (e.g. one for Android upgrade checks) instead of building in a new one, and don't build both platforms unless the task needs both.
- When you're done with a worktree's builds, stop the Metro, Gradle daemon and emulator you started, then run `scripts/clean-worktrees.sh --apply builds` in it. The script skips worktrees that a build tool (Metro, Gradle, Xcode, fastlane, Maestro) still uses, and it never touches `node_modules` itself, `ios/Pods` or the release outputs in `build/`. Run it without `--apply` first to see what it would delete.
- `scripts/clean-worktrees.sh stale` removes worktrees whose HEAD is in `origin/main` with nothing uncommitted and no build tool running, and `derived-data` deletes the DerivedData of learnX workspaces that no longer exist (`all` runs both). Ask Rui before running these with `--apply`, since another session may still own a worktree.
- Leave the shared caches alone: `~/.gradle`, the pnpm store, `~/Library/Caches/CocoaPods`, DerivedData's `ModuleCache.noindex` and the simulator pool.
- In a worktree `pnpm pod` fails (the Bundler gems are only installed in the main checkout): run `LANG=en_US.UTF-8 pod install` in `ios/` and commit only the `Podfile.lock` lines of the pod you changed.
