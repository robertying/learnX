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
- The mock login is not persisted: every relaunch needs the login again.

### Mock data

- `src/data/mock.ts` computes dates relative to now: keep new entries relative and free of sensitive info (emails, phone numbers, student IDs, URLs).
- Assignment submission is disabled after the deadline, so keep some mock deadlines in the future.

## Testing and debugging

### iOS simulators

- Build with `xcodebuild -workspace ios/learnX.xcworkspace -scheme learnX -configuration Debug -destination 'id=<udid>'` (Mac Catalyst: `-destination 'platform=macOS,variant=Mac Catalyst'`); the app lands in `~/Library/Developer/Xcode/DerivedData/learnX-*/Build/Products/`.
- Open in Chinese: `xcrun simctl launch <udid> io.robertying.learnX -AppleLanguages '(zh-Hans)' -AppleLocale zh_CN`.
- Type the mock credentials with the simulator control tool's `text` action (tap the field first); use `pbcopy` + `xcrun simctl pbsync host <udid>` only for text it can't type. iPad and iPhone Duo can't be rotated/folded from the shell.

### Android emulators

- Start an AVD with `~/Library/Android/sdk/emulator/emulator -avd <name>` (`-list-avds`); adb is in `~/Library/Android/sdk/platform-tools`. Foldable AVDs have two displays: `adb exec-out screencap -d <display id> -p` (ids from `adb shell dumpsys SurfaceFlinger --display-id`; a wrong id gives a black frame, none gives warning text); `adb shell wm size` shows which one is active.
- Debug (`pnpm android`) and release (`pnpm android --mode release`) APKs are signed differently: if the other one is installed, `adb install` fails, so `adb uninstall io.robertying.learnx` first (or `adb install -r` for the same type).
- `adb shell input text` goes through Gboard and is flaky: pinyin composes ASCII into CJK and a leading character may double. Switch the keyboard to English (globe key) before typing and verify the field. Hide the keyboard with `keyevent 111`, not BACK (BACK exits the app).
- Chinese UI: `adb shell cmd locale set-app-locales io.robertying.learnx --locales zh-Hans`; light mode: `adb shell cmd uimode night no`.
- Odd resolutions: `adb shell wm size WxH; wm density D` (`wm size reset; wm density reset` afterwards); wait ~15 s for re-layout.

## App Store assets

- Follow `.claude/skills/app-store-assets/SKILL.md` (App Store, Mac App Store, Google Play). Keep the skill and its `scripts/` up to date when the capture workflow changes.
