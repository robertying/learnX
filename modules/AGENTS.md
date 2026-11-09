# modules

Local Expo modules (`expo-module.config.json` in each): `crashlytics`, `menus`, `sidebar`, `spotlight` and `toast`. They have no JS-only fallback, so a change to their native code needs a rebuild.

## Spotlight and App Intents

- `modules/spotlight` (iOS and Mac Catalyst; null elsewhere) indexes the current semester's notices and assignments in Core Spotlight, one domain per type (`notice`, `assignment`; unique ids `<domain>:<id>`), without hidden courses. `helpers/spotlight` (`updateSpotlight`) sends only the items that changed or went (`updateItems`), after a full `replaceItems` the first time in each JS runtime; items don't expire; `helpers/surfaces` calls it, and `clearSpotlight` on logout.
- A tapped result reaches the module's app delegate subscriber (the scene delegate forwards the activity, also on a cold launch, before JS runs). The module keeps it until JS listens: `useSpotlightTaps` opens it with `useOpenTarget`, the same path as notification taps.
- `helpers/shortcuts` (`saveUpcomingDeadlines`, through the same native module) saves the open assignments (as the widget lists them) to `UserDefaults`, which the "Next Deadline" App Intent (`ios/learnX/NextDeadlineIntent.swift`, in the app target so its App Shortcut phrases are extracted) reads without starting React Native. Its Chinese strings are in `ios/learnX/zh-Hans.lproj/Localizable.strings` and `AppShortcuts.strings`.
- The "Next Class" App Intent (`ios/learnX/NextClassIntent.swift`) works the same way with the classes `helpers/surfaces` saves through `saveUpcomingClasses` (`helpers/shortcuts`). All App Shortcuts are listed in the one `LearnXShortcuts` provider in `NextDeadlineIntent.swift`.
- Android has a static "Next class" launcher shortcut (`res/xml/shortcuts.xml`) that opens `learnx://today`.

## Crash reporting

- Firebase Crashlytics is linked natively (iOS, Mac Catalyst, Android). JS errors reach it through `modules/crashlytics`, a local Expo module that records them with their JS frames as the stack (`ExceptionModel` on iOS, a `JavaScriptError` with `JS.fn(file:line:column)` frames on Android). Frames only have a line, so the column (which `metro-symbolicate` needs) goes with the file. Hermes release builds keep function names, though small functions can be inlined into their caller.
- `helpers/crashReporting` installs the global handler (from `index.js`): every uncaught error is recorded as a non-fatal first, then React Native's default handler runs, so fatal ones still crash natively; the `js_fatal` key tells the two apart. `components/ErrorBoundary` wraps the app, reports render errors with their component stack, and offers a reload. Call `recordError` for other errors worth reporting.
- Nothing is reported from debug builds or the mock accounts, and nothing if the native module isn't in the binary. Custom keys: `js_fatal`, `screen` (last route in any navigation container, set by `trackScreen`).
- Crashlytics doesn't symbolicate JS; use `metro-symbolicate` with the source maps from the release build (the release skill, `.claude/skills/release`).
