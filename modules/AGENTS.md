# modules

Local Expo modules, one folder each with its `expo-module.config.json`. They have no JS-only fallback, so a change to their native code needs a rebuild.

A module may have an `index.web.ts(x)` for the Electron app beside its `index.ts(x)`, with the same extension, since Metro tries a `.ts` base file before a `.web.tsx` variant.

## Native tests (iOS)

- Each module's Swift is tested in `modules/<name>/ios/Tests` with Swift Testing, as a CocoaPods test spec that `modules/learnx_module.rb` gives every podspec, hosted in an app since some UIKit APIs need one. The Podfile adds every local module with its tests, so a new module's tests need only a `Tests` folder and a `pod install`. The app's own Swift is tested in `ios/learnXTests`; code the share extension shares with the app lives in `modules/share` and is tested there.
- `scripts/checks/test-ios.sh <simulator udid>` runs them all and prints line coverage, followed by the Swift no test target builds (marked `untested`, outside the total). DerivedData goes outside the repo, to a folder every checkout shares and takes turns with (`scripts/lib/derived-data.sh`).
- Expo's module DSL (`Function`, `AsyncFunction`, `Prop`) only runs from JS, so a module's definition wires names to functions the tests call directly, and its tests build the definition once. OS services sit behind a small protocol with a fake in the tests. Code that writes user defaults takes the suite to use.
- A view's `Prop` closures are tested through its definition, as JS sets them: `@testable import ExpoModulesCore`, then `definition().views[<view type name>]!.propsDict()[<prop>]!.set(value:onView:appContext:)` with JS-shaped values (see `SidebarViewTests`).
- What only UIKit, AppKit or Firebase can call, the bodies of `AsyncFunction` closures and `sendEvent` calls (which need a JS runtime) are left untested. The widget extension is left out of the coverage: its layouts are in `src/widgets`, which Jest tests.
- CocoaPods' test host apps don't adopt scenes, which iOS 27 requires, so the Podfile's `post_install` gives them a scene manifest.

## Native tests (Android)

- `modules/<name>/android/src/test` holds each module's JVM unit tests (JUnit 4, Robolectric, MockK), set up by `modules/unit-tests.gradle`, which each module's `build.gradle` applies. A module's logic is in plain functions that its definition calls.
- `scripts/checks/test-android.sh` runs them with JaCoCo, prints line coverage and the Kotlin no test reaches, and fails when coverage drops below the minimum at its end (kept just under the current total); CI runs it in `Android / Build`. The app module's Kotlin is the React Native template's startup code and is left untested, except its Material 3 dialog module (`android/app/src/test`).

## Windows on iPad and Mac

- iPad and Mac can show several windows (`UIApplicationSupportsMultipleScenes`). Each window is a scene whose `SceneDelegate` starts a React root of its own on the one JS runtime, so the stores and the query cache are shared and each window has its own navigation. The scene delegate passes the root its `windowId` (the scene session's persistent identifier) and the learnx:// link it opens with, since React Native's `Linking.getInitialURL()` only knows the link that launched the app.
- Links, menu commands, notification and Spotlight taps reach JS through emitters that every root listens to. `modules/windows` tracks the window they're for: the one the person last touched, clicked or brought to the front (on iPad every window on screen stays key in its own scene, so the key window alone can't say), or the one a link was just delivered to. `src/services/windows` says whether a root is that window. What the app does once for all windows (logging in again, background fetch, a shared file) runs in the oldest open window.
- A window keeps the learnx:// link of the list (and item) it shows; its scene's restoration activity reopens it there after a relaunch. "Open in New Window" in a card's menu opens a window with the card's link.

## Spotlight and App Intents

- `modules/spotlight` (iOS and Mac) indexes the current semester's items in Core Spotlight. `services/spotlight` keeps a hash of each indexed item and sends only what changed. iOS can empty the index without telling the app (a restore, a move to another device, content search turned off, a Spotlight rebuild), so once per JS runtime it compares a state string stored in the index with what it saved, and indexes everything again on a mismatch. A failed write leaves the state mismatched, so the next launch starts over. The mock account's dates move with the clock, so it sends every item on each launch and hides problems with the saved hashes.
- A tapped result can arrive before JS runs, so the module keeps it until JS listens (`useSpotlightTaps`).
- The App Intents (`ios/learnX/*Intent.swift`, in the app target so their App Shortcut phrases are extracted) read lists that `services/shortcuts` saves to `UserDefaults`, so they answer without starting React Native. Their strings are in the String Catalogs (`src/assets/translations/AGENTS.md`).

## Crash reporting

- Firebase Crashlytics is linked natively. On iOS and Mac, Firebase is a Swift package of the app target, not a pod: Firebase stopped publishing to CocoaPods with 13.0. A pod can't import the app's Swift packages, so `modules/crashlytics` reports through its `CrashReporter` protocol, and the app sets the reporter when it starts Firebase (`ios/learnX/CrashReporting.swift`).
- JS errors are recorded with their JS frames as the stack. Frames only have a line, so the column (which `metro-symbolicate` needs) goes with the file. `services/crashReporting` records every uncaught error as a non-fatal first, then lets React Native's handler run, so fatal ones still crash natively. Call `recordError` for other errors worth reporting. Nothing is reported from debug builds or the mock account.
- Crashlytics doesn't symbolicate JS: `bundle exec fastlane symbolicate` does, with the source maps each build keeps (`scripts/release/symbolicate.mjs` says how it finds them).

## Quick Look on the Mac

- Mac Catalyst's `QLPreviewController` shows only a low-resolution thumbnail of an Office document's first page, so on the Mac `QuickLookView` uses AppKit's `QLPreviewView` from `ios/MacPreview`, an AppKit bundle the app embeds for Mac Catalyst only. Both sides compile `modules/quicklook/ios/MacPreviewHosting.swift`, so the app talks to it without linking AppKit.
- The plugin puts the preview in the `NSWindow` above the UIKit content and keeps it in place every frame, since the view moves without being laid out (the sidebar collapsing, the window resizing). It hides or masks the preview where UIKit content covers it. Sheets on the Mac are windows of their own, above the preview anyway.
- Without the plugin there is no preview: `isQuickLookAvailable` is false, and File detail shows the file's info, as for any file it can't preview.
- Quick Look draws Office documents only while the app is active: a preview opened while another app is in front stays blank until learnX comes to the front. Inside the preview, the layout is Quick Look's own.
- The floating panel (⌘Y, as Space opens it in Finder) works for any downloaded file. Its controller joins the key window's responder chain, where the panel looks for it.

## PDFs

- File detail shows a PDF in `modules/pdf`: PDFKit on iOS and the Mac, which fits the pages to the width, keeps the zoom when the view resizes and opens below a translucent header. The Electron app uses Chromium's viewer.
- On Android, Jetpack's `PdfView` (androidx.pdf) draws the document in an isolated process, so a crash in the renderer can't take the app down; `MainApplication` skips React Native's setup there. Where Jetpack would fall back to the old platform renderer (before Android 15, without the S extension 13 module update), which lays out landscape pages at the wrong size, AndroidPdfViewer on Pdfium draws it instead (`PdfBackend`). `PdfiumView` works around what that library gets wrong: it closes the document on the renderer thread after any render, turns drawing on, and loads again after a resize, which it doesn't refit.

## Sharing files to learnX

- iOS and Mac: the share extension copies the first shared file into the app group, records it in the group's user defaults and opens `learnx://`; `modules/share` hands it to JS once. Plain text isn't taken.
- Android: `MainActivity`'s SEND filter. Only `content:` URIs are taken, since a `file:` URI would be read with learnX's own access.
- Saving out on the Mac goes through the system save panel (`saveFile`), since the app may write only where people pick.

## Updating the Android app

- Android has two flavors: `googlePlay` (which Google Play updates) and `github` (the APKs on GitHub Releases and the TUNA mirror, which update themselves). Only `github` declares the install permissions, which Google Play doesn't allow. Debug builds, `pnpm android` and the E2E builds are `github`.
- The `github` build reads `latest.json` from the mirror (written by fastlane's Android build) and offers a newer version in Settings. It checks every 4 hours while open, on coming back to the app and in the background task once the last check is that old, and posts a notification once per version, also while the app is open, but not before logging in (it waits until someone does) (`services/updateNotifications`; Settings › Notifications › New Versions, on by default, never asks for the permission). `modules/updater` installs the download only if its SHA-256 matches and it is learnX signed with the installed app's key (or one it rotated from). A build without a checksum in `latest.json` opens the APK in the browser instead. The APK goes in Caches and is deleted when the install fails or, since updating ends the app, at the next launch (`watchUpdates`).
- `scripts/e2e/e2e-updater.sh` tests the whole update against a local mirror (`.maestro/AGENTS.md`).
