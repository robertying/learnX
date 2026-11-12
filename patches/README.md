# Patches

pnpm applies these on every install (`patchedDependencies` in
`pnpm-workspace.yaml`). Each is pinned to the exact version it patches, so a
version bump fails the install until the patch is updated or dropped.

To change one: `pnpm patch <pkg>@<version>`, edit the folder it prints, then
`pnpm patch-commit <folder>`. Paths in a patch are relative to the package
folder. `scripts/check-patches.sh` fails the iOS and Android builds when a
patch isn't applied to `node_modules` (`pnpm install --force` fixes that; then run `pod install` in `ios/` again,
since the reinstall wipes the `sqlite3.h` that expo-sqlite's pod copies in). It also fails when a patch changes Android code that Expo ships prebuilt (`local-maven-repo` in the package) and the package isn't in `expo.autolinking.android.buildFromSource` in `package.json`, since the app would link the unpatched build.

Before bumping a patched package, check whether the new release fixes the
issue upstream; drop the patch if so.

| Package                          | What it changes                                                                                                                                                                                                                    | Drop when                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@react-navigation/native-stack` | Adds `headerSubtitle` (used by `getTitleOptions` in `navigation/options.tsx`).                                                                                                                                                     | Upstream adds a subtitle option.                                 |
| `expo-calendar`                  | Android: leaves `IS_PRIMARY` out of the calendar query, which throws on HarmonyOS. iOS: reminder due dates keep their time zone.                                                                                                   | Fixed upstream.                                                  |
| `expo-document-picker`           | Android: picks with `ACTION_GET_CONTENT` so cloud and local providers both show.                                                                                                                                                   | Upstream offers the choice.                                      |
| `expo-widgets`                   | iOS: compiles out Live Activities on Mac Catalyst. Android: tapping a widget opens the app, an `openUrl` modifier for per-row links, `environment.locale` (see `src/widgets/AGENTS.md`).                                           | Upstream supports these.                                         |
| `react-native`                   | `FormData` sends the file name as UTF-8 in `filename` (Web Learning shows a percent-encoded one as is), escaping only quotes and line breaks as browsers do, plus `filename*`.                                                     | Fixed upstream.                                                  |
| `react-native-bottom-tabs`       | iOS: keeps the system label font when no size is set; removes a stale Mac Catalyst 27 toolbar tab bar when the navigator unmounts; sidebar state.                                                                                  | Fixed upstream.                                                  |
| `react-native-pager-view`        | Mac Catalyst: leaves the pan gesture alone when KVO already subclassed the scroll view (crashed in course details).                                                                                                                | Fixed upstream.                                                  |
| `react-native-pdf`               | Android: a recycled view no longer disposes a document still rendering (crash). iOS: keeps the zoom scale when the view resizes.                                                                                                   | Fixed upstream.                                                  |
| `react-native-reanimated`        | `REAReducedMotion.h` includes UIKit on Mac Catalyst.                                                                                                                                                                               | 4.8.0 (fixed on main).                                           |
| `react-native-screens`           | Mac: each split view column keeps its own toolbar, as on iPad. Vertical bar devices (iPhone Duo): fills the strip above an opaque header. iOS 26: an empty header item badge is the system's red indicator dot.                    | Fixed upstream.                                                  |
| `react-native-tab-view`          | `SceneView` lets the native pager size each page instead of a stale measured width.                                                                                                                                                | Fixed upstream.                                                  |
| `react-native-webview`           | iOS: JavaScript alerts present from a view controller that is on screen, or are dismissed (crash). Types: props no longer collapse to `never` ([#3977](https://github.com/react-native-webview/react-native-webview/issues/3977)). | Fixed upstream.                                                  |
| `whatwg-fetch`                   | A response status of 0 rejects the request instead of crashing.                                                                                                                                                                    | React Native stops using `whatwg-fetch`, or it's fixed upstream. |
