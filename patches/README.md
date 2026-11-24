# Patches

pnpm applies these on every install (`patchedDependencies` in
`pnpm-workspace.yaml`). Each is pinned to the exact version it patches, so a
version bump fails the install until the patch is updated or dropped.

To change one: `pnpm patch <pkg>@<version>`, edit the folder it prints, then
`pnpm patch-commit <folder>`. Paths in a patch are relative to the package
folder. `scripts/checks/check-patches.sh` fails the iOS and Android builds when a
patch isn't applied to `node_modules` (`pnpm install --force` fixes that; then run `pod install` in `ios/` again,
since the reinstall wipes the `sqlite3.h` that expo-sqlite's pod copies in). It also fails when a patch changes Android code that Expo ships prebuilt (`local-maven-repo` in the package) and its Gradle project (the package name without the scope's `@`, `/` as `-`: `expo-ui` for `@expo/ui`) isn't in `expo.autolinking.android.buildFromSource` in `package.json`, since the app would link the unpatched build. And it fails when a `react-native` patch changes native code (C, C++, Objective-C, Swift, Java or Kotlin): the app links React Native's native code prebuilt on both platforms, so make such a change in learnX's own native code.

Before bumping a patched package, check whether the new release fixes the
issue upstream; drop the patch if so.

Each patch has tests of what it changes, listed under "Tested by": Jest
(`patches/__tests__`, the JS), hosted unit tests (`ios/learnXTests/Patches`)
and Robolectric (`android/patch-tests`, run by `scripts/checks/test-android.sh`) for
native code, and the E2E flows for what only shows in the running app. A change
to a patch comes with a test that fails without it.
`scripts/__tests__/patches.test.ts` checks that every patch has a section here
and that the tests it names exist.

## `@expo/ui`

- Mac: the `font` modifier makes the system font (a text style or a size) from UIKit's, which draws its weights as React Native's text does; SwiftUI's own medium draws like UIKit's semibold there, so Form item titles looked bolder than list titles.
- Mac: `alignmentGuide` takes `fromTrailing`, a value counted back from the view's trailing edge, so a Form row's separator can end at the row's end (SwiftUI ends it short of the chevron or switch there).
- iOS: `Text` takes `dateStyle: 'countdown'` (with `maxFieldCount`), a live countdown in days, hours and minutes without the seconds the relative style shows, for widget layouts: inside a Text it's part of that text, and on its own it takes the width of the widest value it will show, since a widget lays a live date out only when it renders; a part of a joined Text takes `accessibilityLabel`.
- iOS: `Button` sends its role to the native view as `buttonRole`, since React Native reads a host view's `role` prop as an accessibility role and logs "Unsupported Role value" for `destructive` and `cancel`. `role` still works for widget layouts.
- Android: the `semantics` modifier takes `heading`, which marks a Compose element as a heading for TalkBack (Form section titles and a detail page's title), and a `Host` with `matchContents` sends its size again, a few times with backoff, while its frame stays 0: the size reaches Yoga as a state update that can be dropped, and was only sent again when the content size changed, so What's New's buttons stayed 0x0 and couldn't be tapped.
- Android: a `Text` without a typography takes the style its container provides (a list item's headline, supporting text or overline, a button's label) and a text field's text the field's own (bodyLarge), as Material 3's do, instead of a bare 14 sp style with no line height: Form rows were smaller than list cards and three-line rows had room left at the bottom; and the date range picker's headline leaves out the year, as Material 3 shows a range, since two dates with theirs wrapped a few characters at a time in Chinese.
- Android: Compose UI 1.13 and Material 3 1.5.0 instead of 1.12.1 and 1.5.0-beta01. 1.12 registered a Compose view that detached and re-attached before its deferred registration ran a second time and unregistered it only once, so the view and its whole screen were never freed (header buttons re-added during a header update, as upstream `react-native-screens` does).

**Drop when:** Upstream renames the prop, adds a countdown without seconds to `Text`, adds `heading` to `semantics`, sends a dropped `Host` size again, lets an alignment guide follow the trailing edge, gives text its container's style, lets the range picker's headline be set and depends on Compose UI 1.13 or later.

**Tested by:** `patches/__tests__/expo-ui.test.tsx`, `ios/learnXTests/Patches/ExpoUIPatchTests.swift`, `ios/learnXTests/Patches/ExpoUIFontPatchTests.swift`, `ios/learnXTests/Patches/ExpoUICountdownPatchTests.swift`, `android/patch-tests/src/test/java/io/robertying/learnx/patches/ExpoUIPatchTest.kt`; the `Host` size by `.maestro/07-screens.yaml` (What's New)

## `@react-navigation/native-stack`

Adds `headerSubtitle` (used by `getTitleOptions` in `navigation/options.tsx`).

**Drop when:** Upstream adds a subtitle option.

**Tested by:** `patches/__tests__/native-stack.test.tsx`

## `@shopify/flash-list`

Web (the Electron app): a list that isn't laid out, inside a `display: none` ancestor (a tab that isn't selected, a screen under another in a stack), skips its measuring until it shows, when its `onLayout` measures it again. It measured its rows as 0 px tall there, so every row was in view and rendered, and the recycle pool kept them all once it showed: with a large semester the tabs held about 25,000 elements instead of 2,000, the JS heap 210 MB instead of 50 MB, and opening Notices for the first time took 2.2 s. Native lists are unchanged: a hidden native screen keeps its size.

**Drop when:** Upstream skips measuring a list that isn't laid out on the web.

**Tested by:** `patches/__tests__/web/flash-list.test.tsx`

## `babel-plugin-react-compiler`

An identifier the compiler writes without a source location gets none, instead of the compiler's own marker for that (a Symbol) as its `loc`, as the compiler's other nodes already do. With Expo's tree shaking on (every production bundle, `metro.config.js`), Metro's workers send each file's AST back to the main process by structured clone, which can't clone a Symbol, so bundling failed with "DataCloneError: Symbol() could not be cloned".

**Drop when:** Upstream's `codegenPlace` skips `GeneratedSource` locations.

**Tested by:** `patches/__tests__/babel-plugin-react-compiler.test.ts`; every release bundle, update and web build

## `expo-background-task`

iOS: submits the task as a background app refresh task (`BGAppRefreshTaskRequest`) instead of a processing task, which iOS runs only while the device is idle, usually overnight on the charger; app refresh runs through the day, as often as the app is used. It keeps upstream's identifier, which `ios/learnX/Info.plist` lists.

**Drop when:** Upstream schedules app refresh tasks or lets the app choose.

**Tested by:** `ios/learnXTests/Patches/ExpoBackgroundTaskPatchTests.swift`

## `expo-calendar`

- Android: leaves `IS_PRIMARY` out of the calendar query, which throws on HarmonyOS.
- iOS: reminder due dates keep their time zone.

**Drop when:** Fixed upstream.

**Tested by:** `ios/learnXTests/Patches/ExpoCalendarPatchTests.swift`, `android/patch-tests/src/test/java/io/robertying/learnx/patches/ExpoCalendarPatchTest.kt`

## `expo-document-picker`

Android: picks with `ACTION_GET_CONTENT` so cloud and local providers both show.

**Drop when:** Upstream offers the choice.

**Tested by:** `android/patch-tests/src/test/java/io/robertying/learnx/patches/ExpoDocumentPickerPatchTest.kt`

## `expo-widgets`

- iOS: compiles out Live Activities on Mac Catalyst, leaves `isActivityFullscreen` out of a Live Activity's environment (Xcode 27's SDK marks it back-deployed to iOS 17, but iOS 17's WidgetKit doesn't export it, so linking it stops the app from launching there), and a `ViewThatFitsView` for widget layouts.
- Android: tapping a widget opens the app, `openUrl` (per-row links), `contentDescription` (what TalkBack reads) and `appWidgetBackground` modifiers, Expo UI's `weight` modifier on a Row's or Column's child (Glance's `defaultWeight()`, which the converter drops), 500 and 600 font weights drawn medium instead of normal, and `environment.fontScale`, `cornerRadius`, `width` and `height`.
- Both: `environment.locale`, the system language for text shown before the app's first props (see `src/widgets/AGENTS.md`).
- Podspec: the resource script phase finds the bundle through `PODS_TARGET_SRCROOT`, not the checkout's absolute path, so `Podfile.lock`'s checksum is the same in every checkout.

**Drop when:** Upstream supports these.

**Tested by:** `ios/learnXTests/Patches/ExpoWidgetsPatchTests.swift`, `android/patch-tests/src/test/java/io/robertying/learnx/patches/ExpoWidgetsPatchTest.kt`, `scripts/__tests__/expoWidgetsPodspec.test.ts`; the Mac build

## `react-native`

- `FormData` sends the file name as UTF-8 in `filename` (Web Learning shows a percent-encoded one as is), escaping only quotes and line breaks as browsers do, plus `filename*`.
- Android: `Alert` passes which buttons are destructive (`destructiveButtons`) to the app's Material 3 dialog (`MaterialDialogModule`, which takes the place of React Native's dialog module), which shows them in the error color.

**Drop when:** `FormData`: fixed upstream. `Alert`: React Native passes button styles to Android's dialog module.

**Tested by:** `patches/__tests__/react-native.test.ts`

## `react-native-bottom-tabs`

iOS: lets SwiftUI pick an SF Symbol tab icon's variant (filled in the tab bar, outline in the iPad sidebar) instead of forcing the outline; keeps the system label font when no size is set; removes a stale Mac Catalyst 27 toolbar tab bar when the navigator unmounts; sidebar state; gives tab bar buttons their `testID` when the tabs mount while XCUITest or VoiceOver is connected (UIKit copies a tab's identifier to its button only when it makes the button, before SwiftUI sets it). The tab bar's delegate doesn't hold itself through its tap handler (upstream's captures the modifier, which owns the delegate), so each one made for the tab bar is freed when the next replaces it.

**Drop when:** Fixed upstream.

**Tested by:** `ios/learnXTests/Patches/BottomTabsPatchTests.swift` (incl. the delegate); the column bars and the sidebar state by `ios/learnXUITests/iOS/SplitViewUITests.swift` (iPad); the Mac toolbar by `ios/learnXUITests/Mac/TabsUITests.swift` (logs out and in); the button identifiers by the Maestro flows (`.maestro/subflows/tab.yaml` after a login)

## `react-native-pager-view`

Mac Catalyst: leaves the pan gesture alone when KVO already subclassed the scroll view (crashed in course details).

**Drop when:** Fixed upstream.

**Tested by:** `ios/learnXTests/Patches/PagerViewPatchTests.swift`

## `react-native-screens`

- Split view (`SplitHost`, iOS and Mac):
  - `maxCollapsedWidth` collapses the split to one column while its own bounds are at most that wide, as in compact width (iOS 17+); it's checked natively in the layout pass of the resize, not after a round trip through React.
  - On a foldable half open, the columns meet at the hinge (`UIHingeInteraction`), whatever primary column width React asked for, and follow it as the view resizes; unset widths go back to the system's defaults.
  - `sidebarAutosaveName`: a three-column split keeps whether its sidebar is hidden in user defaults, as NSSplitView's autosave does on the Mac. A display mode UIKit restores with the scene is reported to JS once the split is laid out with it, and `displayMode: 'automatic'` is accepted with any split behavior.
  - The primary column draws an opaque separator against the secondary one (UIKit draws none), hidden when collapsed; with three columns only the sidebar's bar (and on Mac the supplementary column's, which hold the system's sidebar toggle) is left to UIKit.
  - Columns are wrapped in new navigation controllers only when they change, since UIKit throws on re-wrapping one nested in a collapsed primary column before iOS 26. A host that joins the window after its columns mounted (inside a tab) picks them up before it joins, so it collapses as it appears, and gets the tab's safe area so its bars don't sit under the tab bar.
  - `SplitScreen` passes its `style` on.
- Mac:
  - Each split view column keeps its own bar instead of competing for the window's single toolbar, as on iPad; stacks in the detail column, nested stacks in the sidebar, and stacks in a modal stay out of the view controller hierarchy for this, with their bars pinned to the first real top safe-area inset.
  - The line under a header is the separator color, as the column divider is (UIKit's default is the iPhone's darker line).
  - The toolbar search field's clear button reports the empty text (it doesn't call `textDidChange`); the search bar shows no Cancel button, which only empties the field.
- Vertical bar devices (iPhone Duo): fills the strip above an opaque header.
- iOS 26: an empty header item badge is the system's red indicator dot; a header `subtitle` shows below the title (ignored on Android).
- Android: the left header item (Search's Close) stays beside the open search field, also when the header is rebuilt (coming back from a pushed screen), and the field ends where the item's content does, fitted again on every header layout, so Search can be left in one tap with a query in the field.
- Android: a header update leaves the header's items in the toolbar when they're the same ones in the same order, instead of taking every item out of the window and adding it back, which redid each item's attach work on every update.

**Drop when:** Fixed upstream.

**Tested by:** `patches/__tests__/react-native-screens.test.tsx`, `patches/__tests__/native-stack.test.tsx`, `ios/learnXTests/Patches/ScreensPatchTests.swift`; `maxCollapsedWidth` by `ios/learnXUITests/iOS/SplitViewUITests.swift` (iPad mini); the Mac column bars by `ios/learnXUITests/Mac/TabsUITests.swift` and search field by `ios/learnXUITests/Mac/SearchUITests.swift`; Android's Close beside the search field by `.maestro/06-search.yaml`; header items still answering after header updates by the flows' Filter and Search buttons (`.maestro/subflows/filter.yaml`, `search.yaml`)

## `react-native-tab-view`

- `SceneView` lets the native pager size each page instead of a stale measured width.
- `PagerViewAdapter` sends a tab press to the pager once (it sent the page again when the index changed, which restarts Android's slide), and after a jump takes only the page it sent as selected until the pager reports it: a slide cut short by a newer tab press still reports the page it stopped on, so pressing a tab while the last one was still sliding flicked the tabs back to that page.

**Drop when:** Fixed upstream.

**Tested by:** `patches/__tests__/react-native-tab-view.test.tsx`

## `react-native-webview`

- iOS: JavaScript alerts present from a view controller that is on screen, or are dismissed (crash); a page loaded at its top stays below a translucent header until scrolled (WebKit fits an image to the width and leaves it at offset 0).
- iOS: a load that fails after it was committed (`didFailNavigation`) reaches `onError` like one that fails before (`didFailProvisionalNavigation`). WebKit's Quick Look conversion fails that way for a document it can't read (`QuickLookErrorDomain`), which otherwise showed WebKit's own error page and never ended the load, so File detail couldn't offer anything better.
- Types: props no longer collapse to `never` ([#3977](https://github.com/react-native-webview/react-native-webview/issues/3977)).

**Drop when:** Fixed upstream.

**Tested by:** `ios/learnXTests/Patches/WebViewPatchTests.swift`; the types by `pnpm typecheck`

## `whatwg-fetch`

A response status of 0 rejects the request instead of crashing.

**Drop when:** React Native stops using `whatwg-fetch`, or it's fixed upstream.

**Tested by:** `patches/__tests__/whatwg-fetch.test.ts`
