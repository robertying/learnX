# .maestro

## Setup and running

- `.maestro/` holds [Maestro](https://docs.maestro.dev) flows driven by the mock login. `config.yaml` runs the top-level flows in the order of their numbers; `subflows/` is only reached through `runFlow`, and the other folders (`ota/`, `updater/`, `upgrade/`, `store/`) are run by their own scripts. `pinch/` needs the patched Maestro's `pinch`, so `scripts/e2e/e2e.sh android` runs it after the flows only on that build.
- Install the CLI with `brew install mobile-dev-inc/tap/maestro`, but run the flows on the patched build (`scripts/e2e/maestro/README.md`), which every iOS profile and `android-min` need. E2E runs always use a Release build (bundled JS, R8 on Android), never a debug build with Metro: install it with `scripts/e2e/e2e-build.sh`, and rebuild after changing app code. Boot exactly one simulator or emulator, or set `MAESTRO_DEVICE`.
- `pnpm e2e:ios` / `pnpm e2e:android` run every flow (on iOS then the UI tests below); append a path to run one. `scripts/e2e/e2e.sh` passes the app id, the mock login, the translations and the mock data with `-e`: never hard-code them in a flow.
- `pnpm e2e:devices` runs the flows on each device setup in turn. Its header lists the profiles, which device each needs (set by environment variables) and where results go. The oldest supported iOS and Android (`iphone-min`, `android-min`, in Chinese) are tested locally only.
- CI's `Android / E2E tests` runs by hand only, in Chinese, on the APK from `Android / Build`; iOS E2E isn't in CI.
- Every E2E build is built with `TEST_LOGIN=1`, which lets it take test logins from launch arguments and puts the failure's reason in the login toast; store builds have neither, and the fastlane lanes refuse to run with it set. The login check (`01-login-check.yaml`, first in every run) logs in through the real SSO page with a made-up account and expects the server's wrong-password answer: it catches a release build whose login can't reach or read id.tsinghua.edu.cn (a Babel, Metro, Expo or polyfill change that only shows without Metro), which the mock flows can't. On Android it also checks that a network failure comes out as offline, not as a turned-down login.
- Live account (local only, never CI): `--live` runs the flows tagged `live` with the live test login from `.env`, signing in with a fingerprint rather than the SSO page, which would add a device each run. Flows get `ACCOUNT` (`mock` or `live`), and check mock content only for `mock`. Leave flows that change data or depend on mock content untagged. The script keeps Maestro's output, which has the password in it, in a temporary folder it deletes.
- Screenshots: `E2E_SCREENSHOTS=1` saves the screen at each page the flows reach (`subflows/shot.yaml`), for looking through a run's screens on a device setup; the flows still do the checking. Live runs never save any.
- The Electron app's Playwright specs port these flows (`electron/AGENTS.md`). When you change a flow's steps, change its spec too.

## Writing flows

- The flows share one login: `02-reset.yaml` clears the app first, `subflows/login.yaml` logs in only when the app shows the welcome or login page, and the last flow logs out. A flow run alone starts from whatever the app shows. A flow that changes data (favorites, archives, filters) puts it back before it ends.
- Select by `testID` (`id:`) first; otherwise match the visible text or accessibility label in both languages, so the flows pass in English and Chinese. Never copy a label or mock text into a flow: `${T_<key>}` is translation `<key>` as `English|中文` and `${MOCK_*}` the mock items (`scripts/e2e/e2e-env.mjs`). Only labels the app doesn't own (system UI) are written in flows. Regexes must match the whole label: iOS merges a card's texts into one label and reads a badge or count after a button's label, so match content as `'.*(${MOCK_NOTICE}).*'` and such labels as `'(${T_settings})(, .*)?'`. Tests check that every value a flow uses exists in both languages and that every flow and subflow a flow names exists.
- Keep runs fast: a `when: visible` on an element that isn't there (or a `notVisible` on one that is, in a `when` or a `while`), an `optional` tap that finds nothing and an `optional` `extendedWaitUntil` each wait out Maestro's lookup timeout (7 s). Branch on what's known instead (`platform`, the variables `e2e.sh` sets, or `copyTextFrom` on the element that did show), or look for what is usually there with `subflows/shown.yaml` and branch on `output.shown`. `node scripts/e2e/maestro-timings.mjs <run folder>` says where a run's time went, from its `--test-output-dir`: such waits show up as slow skipped runFlows and repeats.
- Keep `$` out of `${...}` scripts (a regex's `$` anchor): Maestro then doesn't evaluate the script, and its raw text counts as true in a `when: true:`. Compare strings instead.
- iOS menu items have no ids, so card actions are tapped in the long-press menu by their translated text. Swipe actions are tested on iOS only: on Android, Maestro's swipe stops short of the full swipe that runs the action. iOS has no system back, so `subflows/back.yaml` swipes from the edge, or taps the back button before iOS 26, where XCTest's swipe doesn't reliably start a pop.
- Keep the flows passing on every `e2e:devices` profile, in both languages.
- System apps: on iOS the flows check what the calendar sync wrote in the Calendar and Reminders apps; on Android the emulator's calendar app needs a Google account, so `scripts/e2e/e2e-calendar.mjs` reads the calendar over adb for the flow.
- Failures are reached with the mock server's launch arguments (`services/launchOptions.ts`), as `10-errors` does.

## Platform quirks

- iOS: header buttons are native bar items and only expose their label. `hideKeyboard` is flaky, so tap something inert instead. Maestro can't type CJK on Android, so search for ASCII mock content.
- Bring a list row on screen before tapping it with `subflows/scroll-list.yaml`: `scrollUntilVisible` swipes the middle of the screen, which is the detail pane in a split view. A row counts as visible under the floating tab bar or navigation bar, where a tap lands on the bar, so scroll one swipe more than it takes to show it.
- Layout: `SPLIT` (iPad, the open iPhone Duo) is the split layout, where a list's items open in a detail column beside it and pages about the open item push there too; branch on it for layout. `IPAD` is for what only an iPad has, such as its paged tab bar.
- iPad: Maestro only sees SpringBoard with Windowed Apps unless it's the patched build, so the `ipad` profile needs Full Screen Apps and `ipad-windowed` a second iPad.
- Android foldable: unfolded, it has the tablet layout, so it stands in for Android tablets.
- iPhone Duo closed: the outer display is short and its bars sit at the side, so bring rows on screen before using them and expect a toast to cover the lower buttons until it goes. Bar buttons moved to the side lose their ids, so system apps' are tapped by label.
- iPhone Duo open: XCUITest's events don't reach the inner display, so the patched Maestro sends its taps, swipes and typing there through `scripts/e2e/sim-touch.swift` (`scripts/e2e/maestro/README.md`). It also loads `scripts/e2e/sim-ax-frame.m` into the app and starts a new runner after each hinge move, without which the tree there lacks everything right of x = 669, such as the tab column. The open profiles open the hinge (`subflows/fold.yaml`, patched Maestro only) and run every flow in the split layout, as on iPad. A permission alert and the system apps (Calendar, Reminders) work there too (`scripts/e2e/maestro/README.md`).

## XCUITest (Mac and iOS)

- Maestro doesn't support the Mac, so the Mac app has XCUITest ports of the flows in `ios/learnXUITests/Mac`, one class per flow, in Chinese. They leave out what the Mac lacks and what would touch the Mac's real notifications or calendars. They match text as the flows do, never copying a label or mock text: `scripts/e2e/e2e-mac.sh` passes `e2e-env.mjs`'s values and the tests name them as string literals. Compare with each language's text rather than match a regex: `NSPredicate`'s `MATCHES` misses some long Chinese titles. Links are opened through `NSWorkspace`, since neither `XCUIApplication.open(_:)` nor `UIApplication.open(_:)` delivers one on Mac Catalyst.
- Run them with `pnpm e2e:mac` on the Release app, with no other learnX Mac app open. They take over the pointer and keyboard and log out of the learnX Mac app, so start them only when the Mac isn't otherwise in use; they aren't in CI. Keep them in step when a flow changes.
- `ios/learnXUITests/iOS` checks what a flow can't see (pixels while a gesture is held, the split view's state across a relaunch), each test skipped on devices it isn't for. `pnpm e2e:ios` runs them after the flows. They aren't in CI.

## Performance

- Performance is measured on E2E builds, which are Release. The `mockScale` launch argument (`large`) grows the mock account's semester to a busy real one (`data/mockScale`); measure at `normal` and `large`.
- `services/perf` marks when the bundle starts running, when the stores have loaded and when the first list is drawn with its content, as User Timing marks in every build. E2E builds also log the launch's marks as `learnX perf {…}` and, on iOS and the Mac, where release builds don't log, keep the last launches' in user defaults (`perfLaunches`). Android reports the first list drawn as the launch's full display (`reportFullyDrawn`, in every build), which `am start -W` and Google Play's startup vitals read.
- `PerfUITests` (`ios/learnXUITests/iOS` and `Mac`) measure launches with XCTest's metrics, starting logged in with the semester cached. They're skipped unless the test runner has `E2E_PERF=1` (`PerfRun` has the other settings); the numbers are in the result bundle (`xcrun xcresulttool get test-results metrics`).

## Store screenshots

- `pnpm store:screenshots <target>` takes the App Store and Google Play screenshots with the flows in `.maestro/store/`, in Chinese; the script's header lists the targets and what each needs. Each shot waits for its screen first, so a wrong screen fails the run instead of being saved. `mac` is an XCUITest and takes over the pointer, so start it by hand.

## Over-the-air updates

- `scripts/e2e/e2e-ota.sh` starts the E2E update server and runs `ota/`: an update downloads and runs, a badly signed one is refused, and a rollback brings back the built-in bundle. The app shows nothing while it downloads, so the flow waits on the server's `/wait`.

## APK updater (Android)

- `scripts/e2e/e2e-updater.sh` serves newer E2E builds of the same checkout from a local mirror and runs `updater/`: the new version's notification (none while logged out, posted on logging in, opening Settings), Android's "Install unknown apps" page, a download with the wrong checksum, then real updates, checked with `dumpsys` afterwards. The flows tap the system's own labels in English and Chinese, which change between Android versions; the script tells them which apply. Run it on the oldest Android too.

## Upgrade test

- `scripts/e2e/e2e-upgrade.sh` installs 18.0.3, uses it, installs the current build over it and checks what the stores imported (the `storeReport` launch argument). 18.0.3 has no testIDs, so its flow taps by English label and position, on a phone layout.
