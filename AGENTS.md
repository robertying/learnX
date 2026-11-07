# AGENTS.md

## Commands

- `pnpm start` runs Metro; `pnpm ios` / `pnpm android` build and launch the app.
- Run prettier after changing files; `pnpm typecheck` and `pnpm lint` must pass before committing.
- Debug builds load JS from Metro; only native changes need a rebuild.

## Mocks

### Mock login

The app can be used without a real Tsinghua account: enter `DUMMY_USERNAME` / `DUMMY_PASSWORD` from the repo-root `.env` on the login screen and it loads `src/data/mock.ts` instead of calling learn.tsinghua.edu.cn (see `src/screens/Login.tsx`). Use it for UI verification, screenshots and manual testing.

- These two values are not real credentials: reading them from `.env` and typing them into the UI is fine, even in tool calls. Do not print or commit any other value in `.env` (tokens, project IDs).
- In mock mode network sync and some features (e.g. course information sharing) are skipped or disabled.
- The default mock login is not persisted: every relaunch needs the login again. To keep the mock data and session across relaunches, log in with `DUMMY_PERSIST_USERNAME` / `DUMMY_PERSIST_PASSWORD` from `.env` instead (same data; relaunch skips the network login).

### Mock data

- `src/data/mock.ts` computes dates relative to now: keep new entries relative and free of sensitive info (emails, phone numbers, student IDs, URLs).
- Assignment submission is disabled after the deadline, so keep some mock deadlines in the future.

## Testing and debugging

### iOS simulators

- Other sessions may be driving the stock simulators with other apps. Use a dedicated one: `xcrun simctl create "learnX <device>" <device type> <runtime>` (`simctl list devicetypes` / `runtimes`), or reuse an existing `learnX …` device from `simctl list devices`.
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
- iPhone and Android are the supported targets; iPad runs the same flows. Mac Catalyst isn't supported by Maestro.

## App Store assets

- Follow `.claude/skills/app-store-assets/SKILL.md` (App Store, Mac App Store, Google Play). Keep the skill and its `scripts/` up to date when the capture workflow changes.
