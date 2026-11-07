# AGENTS.md

## Commands

- `pnpm start` runs Metro; `pnpm ios` / `pnpm android` build and launch the app.
- Run `pnpm format` (Oxfmt) after changing files; `pnpm typecheck` and `pnpm lint` (Oxlint, config in `.oxlintrc.json`) must pass before committing.
- Debug builds load JS from Metro; only native changes need a rebuild.

## React Compiler

- `babel-plugin-react-compiler` (in `babel.config.js`) memoizes every component and hook under `src/`, so new code doesn't need `useMemo`, `useCallback` or `React.memo`. The existing ones are removed in separate PRs.
- The compiler silently skips a function it can't handle and leaves it unmemoized. In 1.0 that includes `try` blocks with `finally`, `throw`, or conditional / logical / optional-chaining expressions (`?:`, `&&`, `||`, `??`, `?.`): compute values before the `try` and keep only the awaited calls inside it. Constants named `use…` are taken for hooks, so don't use that prefix for non-hooks.

## Navigation

- Detail screens (notice, assignment, file, course, assignment submission) take `{ id }` params and read the item from the query cache, so they stay current after a refresh: pass the id, never the item. They show `components/NotFound` when the item is gone and set their header title with `hooks/useHeaderTitle`. Notice and assignment attachments are not in the cache and open `FileDetail` with `{ attachment }`.

## Data

- Settings (`src/data/settings.ts`) and the user's own data (`src/data/userData.ts`: favorites, archives, hidden courses, course order) are Zustand stores persisted to `expo-sqlite/kv-store`. Storage is synchronous, so the stores hold their saved state as soon as they are imported (also in the background task). Read them with `useSettings` / `useUserData` in components and `getSettings` / `getUserData` elsewhere; change them through the exported functions, not `setState` from screens.
- When the persisted shape of a store changes, bump its `version` and add a `migrate`. Keep `merge` filling in defaults for keys added later.
- `src/data/legacy.ts` imports what 18.0.x saved in AsyncStorage (`persist:settings`, and the user data inside the slices of `persist:root`) once, before the UI shows, then deletes both keys. Don't remove it while users can still upgrade from 18.0.x.
- Server data is in TanStack Query (client in `src/data/queryClient.ts`). Semesters, courses and the user are queries (`data/queries.ts`), and so are notices, assignments and files (`data/content.ts`, which also refreshes one course's items for CourseDetail); the semester being shown is `currentSemester` in `data/userData`. Each response is saved to its own SQLite database (`queryCache`) by the per-query persister and loaded back into memory before the UI shows (`restoreQueryCache`), so lists show cached data before the login finishes and offline. Queries run only while logged in (`enabled: loggedIn`). Bump `QUERY_CACHE_VERSION` when a response's shape changes. A file shared to learnX that is waiting to be attached to a submission lives in `data/pendingAssignment` (not persisted).
- Login progress (`loggedIn`, `loggingIn`, the last error) is a Zustand store in `src/data/auth.ts` that isn't persisted; `src/data/login.ts` logs in, out and into the mock account. The credentials are in `src/data/credentials.ts`. There is no Redux.

## Mocks

### Mock login

The app can be used without a real Tsinghua account: enter `DUMMY_USERNAME` / `DUMMY_PASSWORD` from the repo-root `.env` on the login screen and it loads `src/data/mock.ts` instead of calling learn.tsinghua.edu.cn (see `src/screens/Login.tsx`). Use it for UI verification, screenshots and manual testing.

- These two values are not real credentials: reading them from `.env` and typing them into the UI is fine, even in tool calls. Do not print or commit any other value in `.env` (tokens, project IDs).
- In mock mode the app talks to an emulated server instead of learn.tsinghua.edu.cn: `src/data/mockSource.ts` answers every `dataSource` call (and assignment submission) with the mock data after a network-like delay, so refreshes, spinners and errors behave like a real account. Some features (e.g. course information sharing, file downloads) still don't work offline.
- Debug builds show Settings › Network emulation (also linked from the login screen when a mock account is saved) to change the latency, make requests fail (offline, server error, 20 s timeout), reject logins, and log in again as the app does after 10 minutes in the background. The choices reset when the JS reloads.
- The default mock login is not persisted: every relaunch needs the login again, and its login results are ignored. To keep the mock data and session across relaunches, or to test failed logins and logging in again, log in with `DUMMY_PERSIST_USERNAME` / `DUMMY_PERSIST_PASSWORD` from `.env` instead (same data; relaunch logs in through the emulated server).

### Mock data

- `src/data/mock.ts` computes dates relative to now: keep new entries relative and free of sensitive info (emails, phone numbers, student IDs, URLs).
- Assignment submission is disabled after the deadline, so keep some mock deadlines in the future.

## Testing and debugging

### iOS simulators

- Other sessions may be driving the stock simulators with other apps, so use the shared `learnX …` pool instead: `learnX iPhone 18 Pro`, `learnX iPhone 18 Pro 2`, `learnX iPad Pro 11` and `learnX iPhone Duo` (`simctl list devices | grep learnX`). Take one that is shut down; a booted one is probably another session's. Only when every device of the type you need is booted, create the next number (`xcrun simctl create "learnX iPhone 18 Pro 3" <device type> <runtime>`), and delete it (`xcrun simctl delete <udid>`) when you're done. Don't create per-task devices, and shut your device down when you finish.
- Read the app's defaults with `xcrun simctl spawn <udid> defaults read <data container>/Library/Preferences/io.robertying.learnX <key>`; the plist file on disk is written lazily and can be stale.
- Build with `xcodebuild -workspace ios/learnX.xcworkspace -scheme learnX -configuration Debug -destination 'id=<udid>'` (Mac Catalyst: `-destination 'platform=macOS,variant=Mac Catalyst'`); the app lands in `~/Library/Developer/Xcode/DerivedData/learnX-*/Build/Products/`.
- Open in Chinese: `xcrun simctl launch <udid> io.robertying.learnX -AppleLanguages '(zh-Hans)' -AppleLocale zh_CN`.
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

## App Store assets

- Follow `.claude/skills/app-store-assets/SKILL.md` (App Store, Mac App Store, Google Play). Keep the skill and its `scripts/` up to date when the capture workflow changes.
