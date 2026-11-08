# AGENTS.md

## Commands

- `pnpm start` runs Metro; `pnpm ios` / `pnpm android` build and launch the app.
- `pnpm pod` runs `pod install` and `pod update` through Bundler, with the CocoaPods version locked in `Gemfile.lock` (run `bundle install` once first).
- Run `pnpm format` (Oxfmt) after changing files; `pnpm typecheck` and `pnpm lint` (Oxlint, config in `.oxlintrc.json`) must pass before committing.
- Debug builds load JS from Metro; only native changes need a rebuild.

## React Compiler

- `babel-plugin-react-compiler` (in `babel.config.js`) memoizes every component and hook under `src/`, so don't add `useMemo`, `useCallback` or `React.memo` for performance.
- Don't make an effect depend on a function. A function that an effect only calls goes in `useEffectEvent`, and the effect lists the data it reacts to (e.g. `refresh` in `Notices`: `useEffect(() => refresh(), [courseIds, loggedIn])`). The compiler's memoization is an optimization, not a guarantee, so an effect shouldn't rerun just because a function fell out of compilation. `react-hooks/exhaustive-deps` flags the direct cases.
- `useCallback` / `useMemo` are still right where a value has to keep its identity and can't be an effect event: handlers handed to `navigation.setOptions` from an effect, functions and values in a context provider (the split views), and hook outputs that callers use as effect deps (`useFilteredData`).
- Show toasts with the module-level `toast()` from `components/Toast`, not through props or context.
- The compiler silently skips a function it can't handle and leaves it unmemoized. In 1.0 that includes `try` blocks with `finally`, `throw`, or conditional / logical / optional-chaining expressions (`?:`, `&&`, `||`, `??`, `?.`): compute values before the `try` and keep only the awaited calls inside it. Constants named `use…` are taken for hooks, so don't use that prefix for non-hooks.

## Navigation

- `App.tsx` only sets up the providers and picks login or main UI. The navigators are in `src/navigation/` (`stacks.tsx` for the tab and modal stacks, `DetailStack.tsx` for the split view's detail pane, `MainTab.tsx`, and `index.tsx` for the root), with shared header options in `navigation/options.tsx`. The colors and Paper / navigation themes are in `src/theme/`. Startup work lives in hooks: `useStoresLoaded`, `useReLogin`, `useShareHandler` and `useMainStartup` (semester, courses, background fetch and update check once logged in).
- Detail screens (notice, assignment, file, course, assignment submission) take `{ id }` params and read the item from the query cache, so they stay current after a refresh: pass the id, never the item. They show `components/NotFound` when the item is gone and set their header title with `hooks/useHeaderTitle`. Notice and assignment attachments are not in the cache and open `FileDetail` with `{ attachment }`.

## UI components

- Colors come from `useTheme()` in `src/theme` (`theme.colors`, `theme.dark`), not Paper's `useTheme`. `onSurfaceHigh` and `onSurfaceMedium` are the title/body and caption text colors.
- Text uses `Text`, `Title`, `Subheading`, `Paragraph` and `Caption` from `components/Text` (the type scale the app had with Paper), and separators use `components/Divider`. Oxlint blocks importing these from `react-native-paper`.
- Switches use `components/Switch` (`@expo/ui`'s `Switch` in a `Host` tinted with the primary color). The search screen uses the native header search bar (`headerSearchBarOptions`), and cards in selection mode show `components/SelectionMark` (SF Symbol circles on iOS and Mac, the Material checkbox on Android; display only, the card takes the tap).
- React Native Paper is still used for the remaining controls (Menu, TextInput, Snackbar, Chip, ProgressBar, List, Dialog and others), which `PaperProvider` in `App.tsx` themes with `usePaperTheme`. Plan 4.1 moves them off Paper a few at a time.

## Data

- Settings (`src/data/settings.ts`) and the user's own data (`src/data/userData.ts`: favorites, archives, hidden courses, course order) are Zustand stores persisted to `expo-sqlite/kv-store`. Storage is synchronous, so the stores hold their saved state as soon as they are imported (also in the background task). Read them with `useSettings` / `useUserData` in components and `getSettings` / `getUserData` elsewhere; change them through the exported functions, not `setState` from screens.
- When the persisted shape of a store changes, bump its `version` and add a `migrate`. Keep `merge` filling in defaults for keys added later.
- `src/data/legacy.ts` imports what 18.0.x saved in AsyncStorage (`persist:settings`, and the user data inside the slices of `persist:root`) once, before the UI shows, then deletes both keys. Don't remove it while users can still upgrade from 18.0.x.
- TODO: test the upgrade from 18.0.3 on Android. It has been run on the iOS simulator and Mac Catalyst: install 18.0.3, log in with the persistent mock account, change favorites, archives, hidden courses, course order, semester and settings, then install the current build over it. Check that all of it is kept, the AsyncStorage keys and `persist_auth` are removed, and the app stays logged in. Use signed debug builds: an unsigned iOS build loses the keychain login on relaunch, even in 18.0.3.
- Server data is in TanStack Query (client in `src/data/queryClient.ts`). Semesters, courses and the user are queries (`data/queries.ts`), and so are notices, assignments and files (`data/content.ts`, which also refreshes one course's items for CourseDetail); the semester being shown is `currentSemester` in `data/userData`. Each response is saved to its own SQLite database (`queryCache`) by the per-query persister and loaded back into memory before the UI shows (`restoreQueryCache`), so lists show cached data before the login finishes and offline. Queries run only while logged in (`enabled: loggedIn`). Bump `QUERY_CACHE_VERSION` when a response's shape changes. A file shared to learnX that is waiting to be attached to a submission lives in `data/pendingAssignment` (not persisted).
- The background task (`helpers/background.ts`, `syncContent`) logs in with the saved credentials and refetches the current semester's notices, assignments and files with the same queries the screens use, then compares them with what was cached using `diffContent` (`data/contentDiff.ts`): new items, newly graded assignments and moved deadlines. A list that wasn't cached before or failed to fetch reports no changes, so the first sync isn't all new.
- Login progress (`loggedIn`, `loggingIn`, the last error) is a Zustand store in `src/data/auth.ts` that isn't persisted; `src/data/login.ts` logs in, out and into the mock account. The credentials are in `src/data/credentials.ts`. There is no Redux.

## Mocks

### Mock login

The app can be used without a real Tsinghua account: enter `DUMMY_USERNAME` / `DUMMY_PASSWORD` from the repo-root `.env` on the login screen and it loads `src/data/mock.ts` instead of calling learn.tsinghua.edu.cn (see `src/screens/Login.tsx`). Use it for UI verification, screenshots and manual testing.

- These two values are not real credentials: reading them from `.env` and typing them into the UI is fine, even in tool calls. Do not print or commit any other value in `.env` (tokens, project IDs).
- In mock mode the app talks to an emulated server instead of learn.tsinghua.edu.cn: `src/data/mockSource.ts` answers every `dataSource` call (and assignment submission) with the mock data after a network-like delay, so refreshes, spinners and errors behave like a real account. File downloads go through the emulation too, then fetch the mock file's real URL. Some features (e.g. course information sharing) still don't work offline.
- Debug builds show Settings › Network emulation (also linked from the login screen when a mock account is saved) to change the latency, make requests and file downloads fail (offline, server error, 20 s timeout), reject logins, and log in again as the app does after 10 minutes in the background. The choices reset when the JS reloads.
- The default mock login is not persisted: every relaunch needs the login again, and its login results are ignored. To keep the mock data and session across relaunches, or to test failed logins and logging in again, log in with `DUMMY_PERSIST_USERNAME` / `DUMMY_PERSIST_PASSWORD` from `.env` instead (same data; relaunch logs in through the emulated server).

### Mock data

- `src/data/mock.ts` computes dates relative to now: keep new entries relative and free of sensitive info (emails, phone numbers, student IDs, URLs).
- Assignment submission is disabled after the deadline, so keep some mock deadlines in the future.

## Widgets

- The "Deadlines" home screen widget (iOS and Android) is built with `expo-widgets`. Its layouts are `src/widgets/DeadlinesIOS.tsx` (`@expo/ui/swift-ui`) and `src/widgets/DeadlinesAndroid.tsx` (`@expo/ui/jetpack-compose`, limited to what Glance supports). A function with the `'widget'` directive is turned into a string by the widgets Babel plugin (added in `babel.config.js`, since we don't use babel-preset-expo) and runs in the widget runtime: no hooks, imports or outside values, only its props and `environment`. `src/widgets` is left out of the React Compiler.
- `updateDeadlineWidget` (`src/widgets`) is called by `useDeadlineWidget` (main UI, whenever assignments, archives or hidden courses change), by the background sync and on logout. On iOS it writes a timeline with an entry at each upcoming deadline, so due items drop off without the app; Android gets a snapshot with preformatted due times.
- We don't use prebuild, so the native setup the expo-widgets config plugin would generate is checked in: the `ExpoWidgetsTarget` extension (`ios/ExpoWidgetsTarget`, bundle id `io.robertying.learnX.Widgets`, app group `group.io.robertying.learnX`, iOS only, not on Mac Catalyst), its Podfile target, `ExpoWidgetsAppGroupIdentifier` in the app's Info.plist, and on Android `DeadlinesProvider`, its manifest receiver and `res/xml/deadlines_info.xml` / `res/values/expo_widgets.xml`. When upgrading expo-widgets, run its config plugin in a throwaway prebuild copy and compare. Adding a widget means a new Swift widget in `index.swift`, a provider on Android and an entry in `expo_widgets_names`.

## Crash reporting

- Firebase Crashlytics is linked natively (iOS, Mac Catalyst, Android). JS errors reach it through `modules/crashlytics`, a local Expo module that records them with their JS frames as the stack (`ExceptionModel` on iOS, a `JavaScriptError` with `JS.fn(file:line:column)` frames on Android). Frames only have a line, so the column (which `metro-symbolicate` needs) goes with the file. Hermes release builds keep function names, though small functions can be inlined into their caller.
- `helpers/crashReporting` installs the global handler (from `index.js`): every uncaught error is recorded as a non-fatal first, then React Native's default handler runs, so fatal ones still crash natively; the `js_fatal` key tells the two apart. `components/ErrorBoundary` wraps the app, reports render errors with their component stack, and offers a reload. Call `recordError` for other errors worth reporting.
- Nothing is reported from debug builds or the mock accounts, and nothing if the native module isn't in the binary. Custom keys: `js_fatal`, `screen` (last route in any navigation container, set by `trackScreen`).
- Crashlytics doesn't symbolicate JS; use `metro-symbolicate` with the source maps from the release build (see Releases).

## Testing and debugging

### Unit tests (Jest)

- Pure logic lives in `src/helpers` and is tested in `src/helpers/__tests__`. Hooks are tested in `src/hooks/__tests__` with `renderHook` from `@testing-library/react-native` (v14: `renderHook`, `rerender` and `act` are async, so await them).
- Mock native modules and the data layer per test file (`jest.mock('helpers/fs', …)`, `components/Toast`, pickers, `data/source`); use the real Zustand stores (`setSetting`, `setPendingAssignmentData`, `resetUserData`) instead of mocking them. `helpers/html` and `helpers/fs` can't load in Jest. Shared mocks are in `jest/setup.ts`.
- Test hooks that hold real logic (state, ordering, error paths), not thin wrappers around one call.

### iOS simulators

- Other sessions may be driving the stock simulators with other apps, so use the shared `learnX …` pool instead: `learnX iPhone 18 Pro`, `learnX iPhone 18 Pro 2`, `learnX iPad Pro 11` and `learnX iPhone Duo` (`simctl list devices | grep learnX`). Take one that is shut down; a booted one is probably another session's. Only when every device of the type you need is booted, create the next number (`xcrun simctl create "learnX iPhone 18 Pro 3" <device type> <runtime>`), and delete it (`xcrun simctl delete <udid>`) when you're done. Don't create per-task devices, and shut your device down when you finish.
- Read the app's defaults with `xcrun simctl spawn <udid> defaults read <data container>/Library/Preferences/io.robertying.learnX <key>`; the plist file on disk is written lazily and can be stale.
- Build with `xcodebuild -workspace ios/learnX.xcworkspace -scheme learnX -configuration Debug -destination 'id=<udid>'` (Mac Catalyst: `-destination 'platform=macOS,variant=Mac Catalyst'`); the app lands in `~/Library/Developer/Xcode/DerivedData/learnX-*/Build/Products/`. Always build signed, as Xcode does: never pass `CODE_SIGNING_ALLOWED=NO` (or `CODE_SIGN_IDENTITY=""`). An unsigned build has no entitlements, so the share extension can't reach the `group.io.robertying.learnX` app group (sharing to learnX opens the app with nothing shared) and the login is saved under the wrong keychain access group and lost on relaunch. Both look like app bugs but only happen in the unsigned build.
- Open in Chinese: `xcrun simctl launch <udid> io.robertying.learnX -AppleLanguages '(zh-Hans)' -AppleLocale zh_CN`.
- Sharing a file to learnX (Files or Photos › Share › learnX): the share extension (`ShareViewController` in the `react-native-share-menu` patch) copies the file into the app group and opens learnX. To get something to share, copy a file into `File Provider Storage` of the app group container whose metadata says `group.com.apple.FileProvider.LocalStorage` (Files › On My iPhone), or add a photo with `xcrun simctl addmedia`.
- Type the mock credentials with the simulator control tool's `text` action (tap the field first); use `pbcopy` + `xcrun simctl pbsync host <udid>` only for text it can't type. iPad and iPhone Duo can't be rotated/folded from the shell.

### Android emulators

- Start an AVD with `~/Library/Android/sdk/emulator/emulator -avd <name>` (`-list-avds`); adb is in `~/Library/Android/sdk/platform-tools`. Foldable AVDs have two displays: `adb exec-out screencap -d <display id> -p` (ids from `adb shell dumpsys SurfaceFlinger --display-id`; a wrong id gives a black frame, none gives warning text); `adb shell wm size` shows which one is active.
- Debug (`pnpm android`) and release (`pnpm android --mode release`) APKs are signed differently: if the other one is installed, `adb install` fails, so `adb uninstall io.robertying.learnx` first (or `adb install -r` for the same type).
- `adb shell input text` goes through Gboard and is flaky: pinyin composes ASCII into CJK and a leading character may double. Switch the keyboard to English (globe key) before typing and verify the field. Hide the keyboard with `keyevent 111`, not BACK (BACK exits the app).
- Chinese UI: `adb shell cmd locale set-app-locales io.robertying.learnx --locales zh-Hans`; light mode: `adb shell cmd uimode night no`.
- Odd resolutions: `adb shell wm size WxH; wm density D` (`wm size reset; wm density reset` afterwards); wait ~15 s for re-layout.

### End-to-end tests (Maestro)

- `.maestro/` holds [Maestro](https://docs.maestro.dev) flows driven by the mock login: log in and visit every tab, open a notice / assignment / file, favorite and archive, search, settings pages and logout. `.maestro/subflows/` is only reached through `runFlow`.
- Install the CLI with `brew install mobile-dev-inc/tap/maestro`; it runs on the JDK in `JAVA_HOME` (17+). Build and install a debug app, start Metro, and boot exactly one simulator or emulator (or set `MAESTRO_DEVICE=<udid or serial>`).
- `pnpm e2e:ios` / `pnpm e2e:android` run every flow; append a path to run one, e.g. `pnpm e2e:android .maestro/03_favorite_archive.yaml`. `scripts/e2e.sh` passes `APP_ID` (the bundle ids differ in case: `io.robertying.learnX` vs `io.robertying.learnx`) and the two mock values from `.env` with `-e`; never hard-code them in a flow.
- Each flow starts from `clearState` and logs in with the ephemeral mock account, so flows are independent and can run in any order.
- Select by `testID` (`id:`) first; otherwise match the visible text or accessibility label as a regex covering both languages (`'Search|搜索'`), so the flows pass in English and Chinese. Regexes must match the whole label, and iOS merges a card's texts into one label (`'课程, 标题, …'`), so match content as `'.*标题.*'`.
- iOS quirks: after a `clearState` launch the native tab bar buttons lose their identifiers in Maestro's snapshot, so tabs are matched as `'tab-files|doc(ument)?\.fill'` (testID or SF Symbol); the login subflow dismisses the "Save Password?" sheet; `hideKeyboard` is flaky, so tap something inert instead. iOS header buttons are native bar items and only expose their label. Text input is ASCII only: Maestro can't type CJK on Android, so search for ASCII mock content.
- Swipe actions are iOS only; Android opens the same actions from a long-press menu (`subflows/card_actions.yaml` handles both). iOS has no system back, so `subflows/back.yaml` swipes from the left edge, and skips it when the list is still on screen (iPad split view).
- The flows pass on iPhone, iPad, iPhone Duo (folded) and Android (folded and unfolded); Mac Catalyst isn't supported by Maestro.
- iPad: set the simulator to Settings › Multitasking & Gestures › Full Screen Apps; with Windowed Apps Maestro only sees SpringBoard. The tabs sit in a paged top bar (`subflows/tab.yaml` turns the page) and details open beside the list.
- Postures: fold / unfold the Android foldable with `adb emu fold` / `adb emu unfold` (`adb shell cmd device_state state` shows the current one). The iPhone Duo hinge can only be changed by hand in the Simulator window.
- iPhone Duo screenshots need the display: `xcrun simctl io <udid> screenshot --display 1|3 <out.png>` (1 = outer, 3 = inner), or `.claude/skills/app-store-assets/scripts/duo-capture.sh`, since the command can hang.
- TODO: iPhone Duo partially open and fully unfolded. Maestro on iOS only drives the outer display (display 1) and has no display option: with the app on the inner display (3) its screenshots are black, XCTest reports the app's frames offset into the outer display's coordinates, and taps (even at corrected points) don't reach the app.
- TODO: iPad in landscape. Only portrait has been run. The simulator can't be rotated from the shell, so rotate it by hand in the Simulator window (Device › Rotate) and run the flows; landscape shows the tabs and split view differently.

### Worktrees and disk space

- Several sessions work in worktrees under `.claude/worktrees/` at once. A new worktree's `node_modules` is an APFS clone of the main checkout's and costs almost nothing until something is built. What takes real space is what each worktree builds: Xcode DerivedData (one folder per workspace path, 4 to 20 GB, plus `ios/build` when built with `-derivedDataPath ios/build`), `android/app/{build,.cxx}`, and the Gradle outputs that native modules write inside `node_modules/*/android/{build,.cxx}` (about 5 GB).
- Reuse a worktree that already has the build you need (e.g. one for Android upgrade checks) instead of building in a new one, and don't build both platforms unless the task needs both.
- When you're done with a worktree's builds, stop the Metro, Gradle daemon and emulator you started, then run `scripts/clean-worktrees.sh --apply builds` in it. The script skips worktrees that a build tool (Metro, Gradle, Xcode, fastlane, Maestro) still uses, and it never touches `node_modules` itself, `ios/Pods` or the release outputs in `build/`. Run it without `--apply` first to see what it would delete.
- `scripts/clean-worktrees.sh stale` removes worktrees whose HEAD is in `origin/main` with nothing uncommitted and no build tool running, and `derived-data` deletes the DerivedData of learnX workspaces that no longer exist (`all` runs both). Ask Rui before running these with `--apply`, since another session may still own a worktree.
- Leave the shared caches alone: `~/.gradle`, the pnpm store, `~/Library/Caches/CocoaPods`, DerivedData's `ModuleCache.noindex` and the simulator pool.

## Releases

- [fastlane](https://docs.fastlane.tools) (`fastlane/Fastfile`) builds and uploads releases on a Mac. It and CocoaPods are in the `Gemfile`: run `bundle install` once (Ruby 3.2+; `.bundle/config` keeps the gems in `vendor/bundle`), then `pnpm install` and `pnpm pod` (`bundle exec pod install`, so everyone uses the locked CocoaPods) before building.
- `bundle exec fastlane bump version:x.y.z` sets the version in `package.json`, the Xcode project and `android/app/build.gradle`. The build number goes to the next multiple of 10 (18.0.3 is 4530), or up by 1 for a rebuild of the same version (no `version:`); the Android versionCode is 9200000 + the build number.
- `bundle exec fastlane <ios|mac|android> build` builds into `build/release/v<version>/` without uploading anything: the .ipa, the Mac Catalyst .pkg, the AAB, the APKs renamed `learnX-<abi>-v<version>.apk` with `latest.json` (what the in-app updater reads from the TUNA mirror), and the JS source map of each build in `sourcemaps/`. Crashlytics doesn't symbolicate JS, so keep these maps for `metro-symbolicate`. The Android build also uploads native symbols to Crashlytics.
- `<platform> release` builds and uploads; `bundle exec fastlane release notes:<file>` builds all three, then uploads to App Store Connect (not submitted for review), to Google Play as a draft on `track:` (default `production`), and creates a draft GitHub release `v<version>` at HEAD with the APKs, `latest.json` and a zip of the source maps. Release lanes need a clean git tree. Notes come from the release-notes skill: `bundle exec fastlane notes` (after `bump`) runs it through `claude -p` with read-only git/gh tools and saves `build/release/v<version>/release-notes.md`, which the release lanes use when no `notes:` is given, so review and edit it first.
- Secrets go in `fastlane/.env` (git-ignored; fastlane loads it): `APP_STORE_CONNECT_API_KEY_KEY_ID`, `APP_STORE_CONNECT_API_KEY_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_KEY_FILEPATH` (.p8) for App Store Connect and Xcode signing (without them fastlane asks for an Apple ID), `GOOGLE_PLAY_CONSOLE_JSON_KEY` (path to the Play service account JSON; `SUPPLY_JSON_KEY` works too), and optionally `GITHUB_TOKEN` (otherwise `gh auth token`). Android signing reads `LEARNX_RELEASE_*` from `android/local.properties` and `android/app/release.keystore`.

## App Store assets

- Follow `.claude/skills/app-store-assets/SKILL.md` (App Store, Mac App Store, Google Play). Keep the skill and its `scripts/` up to date when the capture workflow changes.
