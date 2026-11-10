# modules

Local Expo modules (`expo-module.config.json` in each): `crashlytics`, `menus`, `share`, `sidebar`, `spotlight` and `toast`. They have no JS-only fallback, so a change to their native code needs a rebuild.

## Native tests (iOS)

- Each module's Swift is tested in `modules/<name>/ios/Tests` with Swift Testing, as a CocoaPods test spec (`s.test_spec 'Tests'` in its podspec, hosted in an app CocoaPods makes, since some UIKit APIs need one). The Podfile adds every local module with its `Tests` spec before `use_expo_modules!`, so a new module's tests need only the spec and a `pod install`. The app's own Swift (App Intents, app delegate) is tested in `ios/learnXTests`, a target hosted in learnX (a synchronized folder: new files need no project change); the share extension's file handling is `SharedFileInbox` in `modules/share`, compiled into both, and tested there.
- `scripts/test-ios.sh <simulator udid>` runs every `<Pod>-Unit-Tests` scheme and the `learnX` scheme, then prints line coverage per file (`scripts/native-coverage.mjs`). DerivedData goes to `$DERIVED_DATA` (default `~/Library/Developer/Xcode/DerivedData/learnX-tests`), never inside the repo.
- Expo's module DSL (`Function`, `AsyncFunction`, `Prop`) only runs from JS, so a module's definition wires names to functions the tests call directly (`Function("takeOpenedItem", Self.takeOpenedItem)`), and its tests build the definition once. OS services sit behind a small protocol with a fake in the tests: `SearchableIndex` (Core Spotlight), `MenuBuilding` (the menu bar builder), `CrashReporter` (Crashlytics). Code that writes user defaults takes the suite to use.
- Left untested: what only UIKit or Firebase can call (`SystemMenuBuilder`, `CrashlyticsModule.reporter`'s default, the share extension's view controller, the Mac-only window size in `SceneDelegate`), the bodies of `AsyncFunction` and `Prop` closures, and the `sendEvent` calls, which need a JS runtime.

## Spotlight and App Intents

- `modules/spotlight` (iOS and Mac Catalyst; null elsewhere) indexes the current semester's notices and assignments in Core Spotlight, one domain per type (`notice`, `assignment`; unique ids `<domain>:<id>`), without hidden courses. `helpers/spotlight` (`updateSpotlight`) sends only the items that changed or went (`updateItems`), after a full `replaceItems` the first time in each JS runtime; items don't expire; `helpers/surfaces` calls it, and `clearSpotlight` on logout.
- A tapped result reaches the module's app delegate subscriber (the scene delegate forwards the activity, also on a cold launch, before JS runs). The module keeps it until JS listens: `useSpotlightTaps` opens it with `useOpenTarget`, the same path as notification taps.
- `helpers/shortcuts` (`saveUpcomingDeadlines`, through the same native module) saves the open assignments (as the widget lists them) to `UserDefaults`, which the "Next Deadline" App Intent (`ios/learnX/NextDeadlineIntent.swift`, in the app target so its App Shortcut phrases are extracted) reads without starting React Native. Its Chinese strings are in the String Catalogs `ios/learnX/Localizable.xcstrings` (dialogs, also the menu bar commands of `modules/menus`) and `AppShortcuts.xcstrings` (Siri phrases); permission prompts are in `InfoPlist.xcstrings` and the widgets' names in `ios/ExpoWidgetsTarget/Localizable.xcstrings`.
- The "Next Class" App Intent (`ios/learnX/NextClassIntent.swift`) works the same way with the classes `helpers/surfaces` saves through `saveUpcomingClasses` (`helpers/shortcuts`). All App Shortcuts are listed in the one `LearnXShortcuts` provider in `ios/learnX/AppShortcuts.swift`, with the `answer` helper both intents use.
- Android has a static "Next class" launcher shortcut (`res/xml/shortcuts.xml`) that opens `learnx://today`.

## Crash reporting

- Firebase Crashlytics is linked natively (iOS, Mac Catalyst, Android). JS errors reach it through `modules/crashlytics`, a local Expo module that records them with their JS frames as the stack (`ExceptionModel` on iOS, a `JavaScriptError` with `JS.fn(file:line:column)` frames on Android). Frames only have a line, so the column (which `metro-symbolicate` needs) goes with the file. Hermes release builds keep function names, though small functions can be inlined into their caller.
- `helpers/crashReporting` installs the global handler (from `index.js`): every uncaught error is recorded as a non-fatal first, then React Native's default handler runs, so fatal ones still crash natively; the `js_fatal` key tells the two apart. `components/ErrorBoundary` wraps the app, reports render errors with their component stack, and offers a reload. Call `recordError` for other errors worth reporting.
- Nothing is reported from debug builds or the mock accounts, and nothing if the native module isn't in the binary. Custom keys: `js_fatal`, `screen` (last route in any navigation container, set by `trackScreen`).
- Crashlytics doesn't symbolicate JS; use `metro-symbolicate` with the source maps from the release build (the release skill, `.claude/skills/release`).

## Sharing files to learnX

- iOS and Mac: the share extension (`ios/ShareExtension/ShareViewController.swift`, no pods) takes the first shared file (Files, Photos; not plain text), copies it into the app group's `Library/Caches/<uuid>/<name>`, records it under `LearnXSharedFile` in the group's user defaults and opens `learnx://`. `modules/share` (`SharedFileInbox`, which the extension compiles in too) hands it to JS once: `takeSharedItem()` for the one that launched the app, the `onShare` event (sent when a `learnx` link arrives) after that. `getSharedFilesDirectory()` is the folder `removeFileDir` clears.
- Android: `MainActivity`'s SEND filter (files and `text/*`); the module reads `EXTRA_STREAM` from the launch intent or a new intent and removes the extras once read. Text without a file comes back as `{ kind: 'unsupported' }`, and the app says only files can be attached.
- `hooks/useShareHandler` copies an Android content URI into the cache and keeps the file in `data/pendingAssignment` for the next submission.
