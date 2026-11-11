# Contributing to learnX

Thanks for helping out. This guide takes you from a fresh clone to running the app on a simulator or emulator, testing it without a Tsinghua account, and opening a pull request. Most of the trouble people hit is in the native setup (Xcode signing, CocoaPods, the Android SDK), so those parts go step by step.

Once you're set up, the code conventions and architecture are in [AGENTS.md](AGENTS.md) and the `AGENTS.md` files in `src/data`, `src/widgets`, `modules` and `.maestro`. They're written for people and coding agents alike.

## What you need

| Tool                 | Version                                                             | Notes                                                                                                                    |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Node.js              | Latest; 26 or newer (`.node-version`, `engines` in `package.json`)  | Any version manager works, but Xcode and Gradle must find `node` too (see [Troubleshooting](#troubleshooting)).          |
| pnpm                 | Any recent pnpm                                                     | pnpm switches itself to the version in `packageManager`. Node 26 doesn't ship Corepack: use `npm i -g pnpm` or Homebrew. |
| macOS + Xcode        | Latest stable Xcode (26 or newer)                                   | Only for iOS, iPadOS and Mac. Install an iOS simulator runtime from Xcode › Settings › Components.                       |
| Ruby + Bundler       | Ruby 4 (`.ruby-version`), from Homebrew                             | Only for iOS and Mac. CocoaPods (1.17, locked in `Gemfile.lock`) runs through Bundler.                                   |
| Android Studio + SDK | SDK Platform 37, Build-Tools 37.0.0, NDK 30.0.16248370, CMake 4.1.2 | Only for Android. Versions are in `android/build.gradle`.                                                                |
| JDK                  | 17 or newer to run Gradle                                           | Android Studio's bundled JDK works. The build compiles with a JDK 17 toolchain, which Gradle downloads if missing.       |

The app supports iOS / iPadOS 17.6, macOS 14.6 (Mac Catalyst) and Android 9 (API 28) and later, so use a simulator or emulator at least that new.

You can build Android on macOS or Linux. iOS and Mac builds need a Mac.

## 1. Install JavaScript dependencies

```sh
git clone https://github.com/<you>/learnX.git
cd learnX
pnpm install
```

pnpm also applies the patches in `patches/` ([patches/README.md](patches/README.md) says what each one fixes).

## 2. Create `.env`

```sh
cp .env.example .env
```

Fill in the mock login with any non-empty values you like, for example:

```sh
DUMMY_USERNAME=appreview
DUMMY_PASSWORD=appreview
```

These aren't real accounts. Typing them on the login screen loads the built-in mock data instead of talking to learn.tsinghua.edu.cn (see [Testing without a Tsinghua account](#testing-without-a-tsinghua-account)). Leave the other keys empty: without `COURSEX_REFRESH_TOKEN`, course information sharing doesn't work, and nothing else needs it.

Restart Metro after changing `.env`.

## 3. iOS, iPadOS and Mac

### Ruby and CocoaPods

Install Ruby with Homebrew and put it first on your `PATH`:

```sh
brew install ruby
echo 'export PATH="$(brew --prefix ruby)/bin:$PATH"' >> ~/.zshrc   # then open a new terminal
ruby -v             # should print 4.x
bundle install      # installs the locked CocoaPods (and fastlane) into Homebrew Ruby's gems
```

Then install the pods:

```sh
cd ios
LANG=en_US.UTF-8 bundle exec pod install
cd ..
```

Run `pod install` again whenever `ios/Podfile`, `ios/Podfile.lock`, a native package or a patch changes. React Native is built from source here (a patch changes its native code), so the first build takes a while.

### Signing: use your own team and bundle IDs

The app, its share extension and its widgets share data through an app group and keep the login in a keychain access group, so every build is signed, simulator builds included. The project is set up for the maintainer's Apple team, so set your own team and bundle IDs once:

1. Add your Apple ID in Xcode › Settings › Accounts. Note your Team ID (10 characters, shown there or on [developer.apple.com](https://developer.apple.com/account) › Membership). Use a paid Apple Developer Program team, which can register the app group.
2. Pick your own bundle ID prefix, such as `com.yourname.learnX`, and rewrite the IDs and team in one go from the repo root:

   ```sh
   NEW_ID=com.yourname.learnX
   TEAM_ID=ABCDE12345
   sed -i '' "s/io\.robertying\.learnX/$NEW_ID/g" \
     ios/learnX.xcodeproj/project.pbxproj \
     ios/learnX/learnX.entitlements ios/learnX/Info.plist \
     ios/ShareExtension/ShareExtension.entitlements ios/ShareExtension/Info.plist \
     ios/ExpoWidgetsTarget/ExpoWidgetsTarget.entitlements ios/ExpoWidgetsTarget/Info.plist
   sed -i '' -E "s/DEVELOPMENT_TEAM = [A-Z0-9]+;/DEVELOPMENT_TEAM = $TEAM_ID;/" \
     ios/learnX.xcodeproj/project.pbxproj
   ```

   That changes the app (`com.yourname.learnX`), the share extension (`….ShareExtension`), the widgets (`….Widgets`), the app group (`group.com.yourname.learnX`) and the keychain group together. They have to stay in step: the app looks for its files in `group.<its bundle ID>`, and extension IDs must start with the app's.

   You can do the same by hand in Xcode: set Development Team once in the `learnX` project's Build Settings (every target inherits it), then for each of the `learnX`, `ShareExtension` and `ExpoWidgetsTarget` targets set the Bundle Identifier under Signing & Capabilities, change the App Group there, and change `LearnXAppGroup` / `ExpoWidgetsAppGroupIdentifier` in the targets' `Info.plist`.

3. Leave Signing on "Automatically manage signing". Xcode registers the IDs and app group for your team on the first build.

Keep these changes local: stage your work with `git add -p`, or `git stash` them before you switch branches.

### Build and run

```sh
pnpm start            # Metro, in its own terminal
pnpm ios              # builds Debug and launches it on a simulator
pnpm ios --simulator "<name>"   # pick a simulator by name (xcrun simctl list devices)
```

You can also open `ios/learnX.xcworkspace` in Xcode, pick the `learnX` scheme and a simulator, and press Run. For the Mac app, pick "My Mac (Mac Catalyst)" as the destination. To run on your own iPhone, plug it in, turn on Developer Mode, and pick it as the destination.

Debug builds load JavaScript from Metro, so JS changes show up on reload. Rebuild only after native changes (Swift, Objective-C, `ios/Podfile`, a native package or a patch).

## 4. Android

### SDK and JDK

1. Install [Android Studio](https://developer.android.com/studio). In its SDK Manager, install Android SDK Platform 37, Build-Tools 37.0.0, NDK 30.0.16248370, CMake 4.1.2 and the platform tools. Gradle can download missing SDK pieces itself once you've accepted the licenses, but installing them up front gives clearer errors.
2. Point your shell at the SDK and put adb on your `PATH`:

   ```sh
   export ANDROID_HOME="$HOME/Library/Android/sdk"   # Linux: $HOME/Android/Sdk
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   ```

   If Gradle still can't find the SDK, copy `android/local.properties.example` to `android/local.properties` and set `sdk.dir`. Debug builds need only `sdk.dir` from that file.

3. Make sure `java -version` prints 17 or newer, or set `JAVA_HOME` to Android Studio's bundled JDK (`/Applications/Android Studio.app/Contents/jbr/Contents/Home` on a Mac).
4. Create an emulator in Android Studio's Device Manager with Android 9 or later. On an Apple silicon Mac, use an arm64-v8a system image.

### Build and run

```sh
pnpm start                        # Metro, in its own terminal
pnpm android --active-arch-only   # builds Debug for the running emulator's ABI only, installs and launches it
```

`--active-arch-only` builds only the emulator's ABI, which saves a lot of build time.

As on iOS, JS changes only need a reload. Rebuild after changes under `android/`, in a native package or in a patch.

## Testing without a Tsinghua account

- **Mock login:** on the login screen, enter `DUMMY_USERNAME` / `DUMMY_PASSWORD` from your `.env`. The app loads `src/data/mock.ts` and answers every request from an emulated server with a realistic delay, so refreshes, spinners, file downloads and errors behave as they would with a real account. The login is saved like a real one, so the app stays logged in across relaunches. Typing it again starts over from the mock data.
- **Network emulation:** debug builds have Network Emulation in the Debug page (the wrench button in Today's header; also linked from the login screen once a mock account is saved). It sets the latency, makes requests and downloads fail (offline, server error, timeout) or rejects logins. The choices reset when the JS reloads.
- **Real accounts are protected in debug builds:** a debug build doesn't send anything that changes a real account (assignment submissions, favorites, course information sharing) until you turn on Allow Server Writes in the Debug page (the wrench button in Today's header). Favorites wait in a queue until then. The switch turns off again on every JS reload. Release builds and the mock account aren't affected.

Mock data details, and how to add to it, are in [src/data/AGENTS.md](src/data/AGENTS.md#mocks).

## Checks

The pull request check (`CI / JS checks` in `.github/workflows/check.yml`) runs these, and all of them must pass:

```sh
pnpm typecheck           # TypeScript (tsc)
pnpm lint --deny-warnings   # Oxlint, type-aware; config in .oxlintrc.json and lint/plugin.mjs
pnpm format --check      # Oxfmt; run `pnpm format` to fix
pnpm test                # Jest, iOS and Android projects
shellcheck scripts/*.sh  # ShellCheck, for the scripts in scripts/
```

They need neither `.env` nor any native setup, so you can run them anywhere Node runs (ShellCheck comes from your package manager, for example `brew install shellcheck`). Lint is strict about a few project rules: Chinese text belongs in `src/assets/translations` (`en.ts` and `zh.ts`), and an intentionally unawaited promise is marked with `void`.

End-to-end flows use [Maestro](https://docs.maestro.dev) against a debug build with the mock login: `pnpm e2e:ios` or `pnpm e2e:android`. See [.maestro/AGENTS.md](.maestro/AGENTS.md).

Other CI jobs (none of them build a signed app or run on a device, so still build and try the app yourself on each platform your change touches, and say in the pull request what you checked):

- `CI / Android unit tests` (required) runs `scripts/test-android.sh` when a pull request touches Android paths; otherwise it skips its steps and passes.
- `Native / Android release build` builds a release APK (R8 and the JS bundle included, debug-signed) when a pull request touches Android paths. Not required.
- `Native / Apple (iOS)` builds the app and runs the native iOS tests (`scripts/test-ios.sh`), by hand only: Actions › Native › Run workflow, on `main` (which also refreshes its compilation cache) or on a branch. Tick "Mac: build" to also build Mac Catalyst (`Native / Apple (Mac)`).
- End-to-end flows run by hand only, on Android: tick "Android E2E tests" when running Native, and `Native / Android E2E tests` runs the Maestro flows in an emulator on the APK from `Native / Android release build`.

## Pull requests

1. Fork the repo and branch off `main`.
2. Keep each pull request to one change. Add or update tests for logic you change (see "Unit tests" in [AGENTS.md](AGENTS.md#unit-tests-jest)).
3. Before pushing, run `pnpm format` and the checks above. Commit only your change, without `.env` or your signing changes.
4. Open the pull request against `main`. Describe what changed and why, how you tested it (platforms, simulators or devices, mock or real account), and add screenshots for visible changes.
5. Changing a patched dependency? Follow [patches/README.md](patches/README.md) (`pnpm patch` / `pnpm patch-commit`) rather than editing `node_modules` by hand.

Pull requests are squash-merged once `CI / JS checks` and `CI / Android unit tests` pass and the change has been reviewed. For bugs and feature ideas, open an issue with one of the templates first.

## Troubleshooting

- **"… isn't applied to node_modules" at the start of a build:** `pnpm install --force`, then `bundle exec pod install` in `ios/` again.
- **"The sandbox is not in sync with the Podfile.lock":** run `bundle exec pod install` in `ios/`.
- **Xcode can't find `node`** (common with nvm, fnm or asdf): create `ios/.xcode.env.local` (git-ignored) with `export NODE_BINARY=/full/path/to/node` (from `command -v node`).
- **Gradle fails running `node`:** Gradle runs `node` while it configures the project. Start Android Studio from a terminal that has `node` on its `PATH` (`open -a "Android Studio"`), or build from the terminal.
- **"Signing for … requires a development team" or a provisioning error:** set your own team and bundle IDs (see [Signing](#signing-use-your-own-team-and-bundle-ids)).
- **The app shows a red screen saying it can't connect to the development server:** start Metro (`pnpm start`). On Android, also run `adb reverse tcp:8081 tcp:8081`.
- **Installing fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`:** learnX from Google Play or a release build is on the device. Uninstall it (`adb uninstall io.robertying.learnx`) and run `pnpm android` again.
- **The mock login doesn't load the mock data** (the login goes to the real server and fails): the `DUMMY_*` values in `.env` are empty, or Metro hasn't picked them up. Fill them in and restart Metro.
