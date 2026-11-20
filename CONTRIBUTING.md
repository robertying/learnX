# Contributing to learnX

Thanks for helping out. This guide takes you from a fresh clone to running the app on a simulator or emulator (or as the Windows and Linux app), testing it without a Tsinghua account, and opening a pull request. Most of the trouble people hit is in the native setup (Xcode signing, CocoaPods, the Android SDK), so those parts go step by step.

Once you're set up, the code conventions and architecture are in [AGENTS.md](AGENTS.md) and the `AGENTS.md` files in the folders it lists. They're written for people and coding agents alike.

## What you need

| Tool                 | Version                                                                                  | Notes                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Node.js              | `.node-version` (`engines` in `package.json` is the minimum)                             | Any version manager works, but Xcode and Gradle must find `node` too (see [Troubleshooting](#troubleshooting)).                |
| pnpm                 | Any recent pnpm                                                                          | pnpm switches itself to the version in `packageManager`. Recent Node doesn't ship Corepack: use `npm i -g pnpm` or Homebrew.   |
| macOS + Xcode        | Latest stable Xcode                                                                      | Only for iOS, iPadOS and Mac. Install an iOS simulator runtime from Xcode › Settings › Components.                             |
| Ruby + Bundler       | `.ruby-version`, from Homebrew                                                           | For iOS and Mac, where CocoaPods (locked in `Gemfile.lock`) runs through Bundler. `pnpm check` needs Ruby itself, not Bundler. |
| Android Studio + SDK | The SDK Platform, Build-Tools, NDK and CMake versions in `ext` in `android/build.gradle` | Only for Android.                                                                                                              |
| JDK                  | 17 or newer to run Gradle                                                                | Android Studio's bundled JDK works. The build compiles with a JDK 17 toolchain, which Gradle downloads if missing.             |
| Electron             | Downloaded by `pnpm electron`                                                            | Only for the Windows and Linux app. Nothing else to install; a Mac dev run also needs Xcode.                                   |

Use a simulator or emulator at least as new as the oldest OS the app supports (in the README).

You can build Android on macOS or Linux, and run the Windows and Linux app on any of the three. iOS and Mac builds need a Mac.

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

These aren't real accounts. Typing them on the login screen loads the built-in mock data instead of talking to learn.tsinghua.edu.cn (see [Testing without a Tsinghua account](#testing-without-a-tsinghua-account)). Leave the live login keys empty unless you run live tests.

Restart Metro after changing `.env`.

## 3. iOS, iPadOS and Mac

### Ruby and CocoaPods

Install Ruby with Homebrew and put it first on your `PATH`:

```sh
brew install ruby
echo 'export PATH="$(brew --prefix ruby)/bin:$PATH"' >> ~/.zshrc   # then open a new terminal
echo 'export LANG=en_US.UTF-8' >> ~/.zshrc   # CocoaPods needs a UTF-8 locale
ruby -v             # should match .ruby-version
bundle install      # installs the locked CocoaPods (and fastlane) into Homebrew Ruby's gems
```

Then install the pods:

```sh
cd ios
bundle exec pod install
cd ..
```

Run `pod install` again whenever `ios/Podfile`, `ios/Podfile.lock`, a native package or a patch changes. Firebase isn't a pod: it's a Swift package of the Xcode project, which Xcode downloads on the first build (about 1 GB, in the build folder's `SourcePackages`).

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

macOS registers every copy of the app it sees, so after builds in several folders the share sheet can offer learnX once per copy. `scripts/dev/unregister-apps.sh` lists the copies it would unregister, keeping `/Applications/learnX.app`; run it with `--apply` to unregister them, and see its header for the options (another bundle ID or apps to keep).

Debug builds load JavaScript from Metro, so JS changes show up on reload. Rebuild only after native changes (Swift, Objective-C, `ios/Podfile`, a native package or a patch).

## 4. Android

### SDK and JDK

1. Install [Android Studio](https://developer.android.com/studio). In its SDK Manager, install the SDK Platform, Build-Tools, NDK and CMake versions in `ext` in `android/build.gradle`, and the platform tools. Gradle can download missing SDK pieces itself once you've accepted the licenses, but installing them up front gives clearer errors.
2. Point your shell at the SDK and put adb on your `PATH`:

   ```sh
   export ANDROID_HOME="$HOME/Library/Android/sdk"   # Linux: $HOME/Android/Sdk
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
   ```

   If Gradle still can't find the SDK, copy `android/local.properties.example` to `android/local.properties` and set `sdk.dir`. Debug builds need only `sdk.dir` from that file.

3. Make sure `java -version` prints 17 or newer, or set `JAVA_HOME` to Android Studio's bundled JDK (`/Applications/Android Studio.app/Contents/jbr/Contents/Home` on a Mac).
4. Create an emulator in Android Studio's Device Manager with a supported Android version. On an Apple silicon Mac, use an arm64-v8a system image.

### Build and run

```sh
pnpm start                        # Metro, in its own terminal
pnpm android --active-arch-only   # builds Debug (the github flavor) for the running emulator's ABI only, installs and launches it
```

`--active-arch-only` builds only the emulator's ABI, which saves a lot of build time.

As on iOS, JS changes only need a reload. Rebuild after changes under `android/`, in a native package or in a patch.

## 5. Windows and Linux (Electron)

The Windows and Linux app is an Electron app around a web build of the same code (`electron/`, with its own [AGENTS.md](electron/AGENTS.md)). You can run it on Windows, Linux or a Mac; it needs only Node and pnpm, and a `.env` with the mock login (step 2).

```sh
pnpm electron          # exports the web build, downloads Electron on the first run, and opens the app
pnpm e2e:electron      # the Playwright tests, on the last web build (run `pnpm electron` once first)
```

- On a Mac the dev run opens a renamed copy of Electron, `build/electron/learnX.app`, whose icon is compiled with Xcode's `actool`, so it needs Xcode too. Afterwards, `pnpm electron:clean` removes what dev runs leave on the Mac.
- On Linux the dev run turns Chromium's sandbox off, which Ubuntu 24.04 and later would block, and keeps the saved login out of your keyring. Running the E2E tests without a desktop needs a virtual display: `xvfb-run pnpm e2e:electron`.
- The E2E tests' windows open behind your other windows without taking focus (on a Mac they don't show at all), so you can keep working while they run. Append a file name or `-g <title>` to run some of them (`pnpm e2e:electron tray`).
- Installers: `pnpm electron:package` builds the installers for both platforms on a Mac (Apple silicon needs no Rosetta), Windows or Linux; `--win` or `--linux` builds one platform's.

## Testing without a Tsinghua account

- **Mock login:** on the login screen, enter `DUMMY_USERNAME` / `DUMMY_PASSWORD` from your `.env`. The app loads `src/data/mock.ts` and answers every request from an emulated server with a realistic delay, so refreshes, spinners, file downloads and errors behave as they would with a real account. The login is saved like a real one, so the app stays logged in across relaunches. Typing it again starts over from the mock data. The data comes in Chinese or English, whichever language the app asks the emulated server for; the English texts are in `src/data/mockEnglish.ts`, and a new item in `mock.ts` needs its English texts there.
- **Network emulation:** debug builds have Network Emulation in the Debug page (the wrench button in Today's header; also linked from the login screen once a mock account is saved). It sets the latency, makes requests and downloads fail (offline, server error, timeout) or rejects logins. The choices reset when the JS reloads.
- **Real accounts are protected in debug builds:** a debug build doesn't send anything that changes a real account (assignment submissions, favorites, course information sharing) until you turn on Allow Server Writes in the Debug page (the wrench button in Today's header). Favorites wait in a queue until then. The switch turns off again on every JS reload. Release builds and the mock account aren't affected.

Mock data details, and how to add to it, are in [src/data/AGENTS.md](src/data/AGENTS.md#mocks).

## Checks

Every required pull request check must pass. The JavaScript ones (`.github/workflows/js.yml`) run these:

```sh
pnpm check                              # the checks package.json lists under check, as JS / Checks runs them
scripts/checks/check-release-bundle.sh  # the Android and iOS release JS bundles
```

`pnpm check` needs neither `.env` nor any native setup, only ShellCheck (from your package manager, for example `brew install shellcheck`) and Ruby, for the release lanes' tests (plain minitest, which comes with Ruby, so no `bundle install`); run `pnpm format` to fix formatting. The bundle check needs a `.env` with the mock login and takes a couple of minutes. Lint is strict about a few project rules: Chinese text belongs in `src/assets/translations`, and an intentionally unawaited promise is marked with `void`.

End-to-end flows use [Maestro](https://docs.maestro.dev) against a Release build with the mock login: install it with `scripts/e2e/e2e-build.sh ios <simulator udid>` or `scripts/e2e/e2e-build.sh android <emulator serial>`, then run `pnpm e2e:ios` or `pnpm e2e:android`. See [.maestro/AGENTS.md](.maestro/AGENTS.md).

The other CI jobs are in `.github/workflows/`. The required ones skip their steps (and pass) when a pull request can't affect what they check; the device E2E runs, the Apple builds and the Electron installers run only by hand (Actions › Run workflow). None of them builds a signed app or runs on a device, so still build and try the app yourself on each platform your change touches, and say in the pull request what you checked.

## Pull requests

1. Fork the repo and branch off `main`.
2. Keep each pull request to one change. Add or update tests for logic you change (see "Unit tests" in [AGENTS.md](AGENTS.md#unit-tests-jest)).
3. Before pushing, run `pnpm format` and the checks above. Commit only your change, without `.env` or your signing changes.
4. Open the pull request against `main`. Describe what changed and why, how you tested it (platforms, simulators or devices, mock or real account), and add screenshots for visible changes.
5. Changing a patched dependency? Follow [patches/README.md](patches/README.md) (`pnpm patch` / `pnpm patch-commit`) rather than editing `node_modules` by hand.

Pull requests are squash-merged once the required checks pass and the change has been reviewed. For bugs and feature ideas, open an issue with one of the templates first.

## Troubleshooting

- **"… isn't applied to node_modules" at the start of a build:** `pnpm install --force`, then `bundle exec pod install` in `ios/` again.
- **"The sandbox is not in sync with the Podfile.lock":** run `bundle exec pod install` in `ios/`.
- **Xcode can't find `node`, or a build fails running `node` after you upgrade or switch Node:** the first `pod install` writes `ios/.xcode.env.local` (git-ignored) with the full path of the `node` it ran, which with Homebrew, nvm, fnm or asdf includes the version. Delete the file and run `bundle exec pod install` again, or set `export NODE_BINARY=/full/path/to/node` in it yourself.
- **Gradle fails running `node`:** Gradle runs `node` while it configures the project. Start Android Studio from a terminal that has `node` on its `PATH` (`open -a "Android Studio"`), or build from the terminal.
- **"Signing for … requires a development team" or a provisioning error:** set your own team and bundle IDs (see [Signing](#signing-use-your-own-team-and-bundle-ids)).
- **The app shows a red screen saying it can't connect to the development server:** start Metro (`pnpm start`). On Android, also run `adb reverse tcp:8081 tcp:8081`.
- **Installing fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`:** learnX from Google Play or a release build is on the device. Uninstall it (`adb uninstall io.robertying.learnx`) and run `pnpm android` again.
- **The mock login doesn't load the mock data** (the login goes to the real server and fails): the `DUMMY_*` values in `.env` are empty, or Metro hasn't picked them up. Fill them in and restart Metro.
