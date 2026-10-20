---
name: app-store-assets
description: Capture App Store / Mac App Store / Google Play screenshots (iPhone, iPad, iPhone Duo, Mac Catalyst, Android phone and tablet) and Header / Search Results / feature graphic creative assets for learnX from mock data. Use when asked to update, recapture or review store assets.
---

# Store assets for learnX

Reproduce the existing store screenshots with the current UI, from mock data only (mock login, mock data rules, simulator/emulator basics: see AGENTS.md).

- **Never write output into the repo**: save to `~/Downloads/learnX-app-store-assets/` for the user to review (layout in [Output](#output)). Never upload to App Store Connect (ASC) or Play Console unless asked.
- Keep generated helper binaries in one scratch dir (`/tmp/store-tools`), built from `scripts/` with `swiftc -O`.
- Shots are zh-Hans, light mode, mock data. Mock dates are relative to now, so rebuild first if the build is old.
- **No red dots**: before capturing, temporarily edit `src/data/mock.ts` so no badge shows (Settings tab/sidebar entry and rows): `courseInformationSharingBadgeShown: true`, `lastShowChangelogVersion` = `version` from `package.json`, `newUpdate: false`. Reload or rebuild, check every shot, then `git checkout src/data/mock.ts` (never commit it).

## Requirements

| Asset                                                      | Size / format                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| iPhone (medium display)                                    | 1206x2622, up to 10                                                                                  |
| iPad 13"                                                   | 2752x2064 (landscape) or 2064x2752                                                                   |
| iPhone Duo (new; required from Apr 2027 with iOS 27.1 SDK) | outer 1398x2034, inner 2007x2853 (or rotated)                                                        |
| Mac                                                        | 16:10, 2880x1800                                                                                     |
| Header                                                     | 21:9, 3840x1646                                                                                      |
| Search results                                             | 3:2, 1920x1280 to 3840x2560                                                                          |
| Universal header+search                                    | 16:9 PNG 5244x2950                                                                                   |
| Play feature graphic                                       | exactly 1024x500, JPEG/24-bit PNG                                                                    |
| Play phone                                                 | 320-3840 px per side, long side ≤ 2x short, 2-8 shots; 9:16 ≥1080x1920 to be recommendation-eligible |
| Play 7"/10" tablet, Chromebook                             | 1080-7680 px, 16:9 / 9:16, 4-8 shots                                                                 |

## Screens to capture

**iPhone (10):** 1 notices list; 2 notices with a row swiped (heart/archive) and the filter menu open; 3 notice detail 第一次大作业 (has an attachment); 4 assignments, filter 全部; 5 assignment submission (open 第一次大作业, upload arrow; needs a future deadline); 6 files; 7 PDF preview of 人类视觉系统 scrolled to the "Climate Change" page; 8 courses with 量子与统计 swiped open (yellow hide action); 9 search "作业"; 10 Settings → 日历与提醒事项.

**iPad (8) and Mac (8)** use the same screens with a detail pane: notices + detail; filter menu + swiped row; assignments + detail; submission; files + PDF; courses (row swiped) + course detail; search "作业"; settings + calendar page.

**Android phone (8):** notices, notice detail, assignments, submission, files PDF, courses, search, calendar settings.

**Android tablet (7, split view):** notices + detail, assignments + detail, submission, PDF, courses + course detail, search, calendar settings.

## Output

Everything final goes under `~/Downloads/learnX-app-store-assets/`:

| Folder            | Contents                                       |
| ----------------- | ---------------------------------------------- |
| `ios/`            | Header, search results                         |
| `ios/iphone/`     | iPhone shots                                   |
| `ios/ipad/`       | iPad 13" shots                                 |
| `ios/iphone-duo/` | Duo shots, fold state in the filename          |
| `macos/`          | Mac App Store shots, Mac header/search results |
| `android/`        | Play feature graphic                           |
| `android/phone/`  | Android phone shots                            |
| `android/tablet/` | Android tablet shots                           |
| `readme/`         | README screenshots                             |

File names follow one pattern everywhere:

- Screen shots: `NN-<slug>.png`, where `NN` is the screen's position in its device list above (two digits) and `<slug>` is a short lowercase kebab-case name, e.g. `01-notices.png`, `03-notice-detail.png`. A variant of a screen appends to its slug, e.g. `08-courses-plain.png`, and the Duo fold state is a variant too, e.g. `01-notices-folded.png`.
- Creative assets: `<asset>.png`, using the asset name from the Requirements table, placed directly in `ios/`, `macos/` or `android/` (no subfolder).
- The extension follows the format: `.png` by default, `.jpg` where the tool writes JPEG (the Android tablet handle fix).
- Raw captures and compose inputs stay in the scratch dir. Only final files go to Downloads.

## iOS / iPadOS / Mac Catalyst

- Debug builds need Metro (`pnpm start`).
- Wait ~5 s before each capture so scroll bars fade and transitions (blurred frames) finish; check every shot's status bar (signal, clock).
- Status bar: `xcrun simctl status_bar <udid> override --time 9:41 --batteryState discharging --batteryLevel 100 --wifiBars 3 --cellularBars 4` (`charged` shows a bolt; `status_bar clear` when done).
- Capture: `xcrun simctl io <udid> screenshot out.png` (native pixels); prefer it over the control tool's `screenshot`.
- Text entry: keyboard check key (349,780), wait ~1 s, then 登录 (a tap during the keyboard dismiss is swallowed; tap again). CJK goes through the simulator pasteboard and may leave focus stuck: re-tap the target field. Where the control tool can't be used (Device Hub, Mac), paste: host `printf %s "$VAR" | pbcopy`, `xcrun simctl pbsync host <udid>`, wait 4 s (`simctl pbpaste <udid> | wc -c`), long-press the field, tap the 粘贴 bubble, **then** clear the host clipboard (clearing earlier empties the simulator pasteboard too).
- The simulator control tool stays bound to the last device: `detach` then `attach` by name before tapping; after `SimulatorNotBooted`, re-attach.

### iPhone 18 Pro (402x874 pt)

- Tab bar y≈824: 通知 63, 作业 132, 文件 200, 课程 270, 设置 337. Back (55,85), close X (40,85), top-right action (363,85), filter button (100,85), search magnifier (363,85 on lists).
- Login: username (201,421), password (201,500), then check key (349,780) and 登录 (201,621). Paste bubble (fallback) sits ~40 pt above the field.
- Row swipe: notices `swipe` (340,y)→(120,y) 0.4 s; **courses need `touch_path`** (330→215, ~6 points, 40 ms, last dt 300 ms). Reverse swipe closes it.
- Filter menu: tap the entry (Assignments 全部 ≈ (85,263)).
- PDF: wait ~7 s; 5 slow swipes (260,760)→(260,200) 1.6 s (keep x≥200, edges trigger back), one drag down 550, one short drag 300→380.
- Search: tap magnifier, long-press field (180,143), tap 粘贴 (49,189), then search key (348,780).
- The "Speed up your typing" sheet shows once; tap Continue.

### iPad 13" (iPad Pro 13-inch (M5))

- **Cannot be rotated from the shell** (no Simulator.app, no `simctl` rotate): ask the user to rotate to landscape and wait; `simctl io` then returns 2752x2064.
- Control tool space 1376x1032 pt landscape; scale from a downsized screenshot by pts/px.
- Landscape: sidebar 通知 (86,117), 作业 (86,162), 文件 (86,205), 课程 (86,249), 设置 (86,294); list header filter (373,55), search (528,55); first filter entry (358,115); submit arrow (1336,55); search key (1291,790). Row swipes need `touch_path` (x 540→365, ~7 points); do it on a non-selected row.
- The master pane opens narrow: drag the divider (x≈561 pt, y 600-700) in small `touch_path` steps; verify by scanning pixels, not by eye. The UIKit divider snaps, ~360 pt is reachable.
- Search: the keyboard offers a pasteboard suggestion; use either it or paste, not both.
- Windowed Apps: corner drag (1372,1022) resizes, top-edge drag moves.

### iPhone Duo

- Simulator "iPhone Duo". Two displays: outer 1398x2034 (`--display 1`, folded), inner 2007x2853 (`--display 3`, 2853x2007 when open). `simctl io ... screenshot --display N` can hang: use `scripts/duo-capture.sh <display> <out.png>`.
- Fold state is only changeable in Device Hub (`/Applications/Xcode.app/Contents/Applications/DeviceHub.app`): three icons at the bottom: folded, half-folded, open.
- Clicks might get rejected sometimes; what works is posting CGEvents from the shell (`scripts/mouse.swift press x y 0.12`) at screen points. Needs Accessibility for the shell host. Screenshots are 1512 px wide for a 1920 pt display: multiply by 1920/1512.
- Half-folded/open show a split view: select a row before each capture. Tabs are the icon column at the right edge. Paste: click the field twice.
- PDF scroll must be a vertical drag with constant x fully inside the device image.
- Output: `ios/iphone-duo/NN-<slug>-{folded,half,open}.png`.

### Mac (window 1096x741 pt)

- Needs macOS Screen Recording + Accessibility for the shell host (`AXIsProcessTrusted()`); restart the host app after granting. Launch: `open <DerivedData>/.../Debug-maccatalyst/learnX.app --args -AppleLanguages '(zh-Hans)'`.
- Helpers: `scripts/click.swift` (CGEvent click), `mouse.swift` (press / drag), `scroll.swift`, `bounds.swift` (window x y w h), `window-id.swift`. Click at window-relative points.
- Login fields (548,359) / (548,438), 登录 (548,538), paste with System Events Cmd+V after `pbcopy`.
- Points: sidebar 通知 (61,70) 作业 (61,100) 文件 (61,132) 课程 (61,164) 设置 (61,196); notice row 3 (310,463); filter (302,71); submit (1068,70); search (530,70); 日历与提醒事项 (329,323). A mis-click on 退出登录 opens a confirm that only Escape dismisses.
- Row swipes: `mouse drag` 0.4-0.5 s. PDF: `scroll x y 60 80` down then `-60 40` up.
- Capture: `screencapture -x -o -l <CGWindowID> window.png` into the scratch dir (2192x1482, transparent corners).
- Compose: `compose-mac window.png <icon.png> macos/NN-<slug>.png 2880 1800 store` (`store` = the layout kind, see Mac header and search results).

## Android (phone + tablet)

- Debug builds need Metro (`pnpm start`).
- Wait ~5 s before each capture so scroll bars fade and transitions finish; check every shot's status bar.
- General adb/emulator handling (display ids, install, keyboard, locale) is in AGENTS.md. For store shots:
- **Sizes**: foldable AVDs are off-spec natively (open 2076x2152 ≈ 1:1; folded 1080x2364 = 2.19:1). Override the size: phone `wm size 1080x1920; wm density 420`, tablet `wm size 2560x1440; wm density 280` (split view; a Pixel Tablet is 276 dpi: at 320 the list pane is too narrow and texts wrap).
- **Status bar**: do not use SystemUI demo mode (duplicates the wifi icon, shows "3G"). The real bar shows 9:41 and wifi. Keep mobile data enabled (disabled draws a "!" at the signal), pin `adb emu gsm signal-profile 4`, and crop-check the signal icon of every shot (it dips after `wm size` changes). Remove the "Set a screen lock" shield notification: `locksettings set-pin 1234`, `cmd safety_center refresh --reason OTHER`; `locksettings clear --old 1234` afterwards.
- **Login**: the first 登录 tap after hiding the keyboard is often swallowed: tap again. CJK search "作业": globe until the space bar says 拼音, type `zuoye`, commit with SPACE (`keyevent 62`), then Enter and ESC on phone. On tablet skip ESC and candidate taps (they highlight the links incorrectly): tap the list-pane search icon, never a result row, before capturing.
- **Phone 1080x1920**: tabs y≈1715 at x 108/323/540/756/972; back/close (74,220); top-right action (985,213); search (985,211); 日历与提醒事项 (250,900).
- **Tablet 2560x1440 @280**: tabs y≈1312 at x 55/166/278/390/502; list-pane search (496,157); detail back (611,157); submit arrow (2484,160); 日历与提醒事项 (200,608); divider x≈560.
- **PDF**: wait ~9 s. Phone: 5 swipes (540,1500)→(540,400) 700 ms. Tablet: 14 swipes (1600,1150)→(1600,250) 500 ms, 3 back down, then nudge until "Climate Change" is at the top.
- **Tablet handle**: large-screen shots have a dark bar at top centre (the windowing app handle; none on phone): paint it out with `scripts/android-fix-handle.swift <in.png> <out.jpg>` (copies the header color from x=1120 over x 1150-1410, y 0-110; writes an opaque JPEG), output under `android/tablet/`. The camera punch hole (top centre phone, top left tablet) is drawn only by the emulator window, not in `screencap` output.

## Header / search results / feature graphic

The gradient is the light store one in every script. Each output goes into its platform folder (`ios/`, `macos/`, `android/`).

### iOS header and search results

- Header: `scripts/compose-header-wordmark.swift <out.png> 3840 1646 learnX 网络学堂新选择`. Use the same file for iOS and Mac. No icon.
- Search results: build the 16:9 universal with `SHOT2=<08-courses-plain.png> compose-iphone-bezel <01-notices.png> <PhoneComposite.pdf> <icon.png> <universal.png> 5244 2950 universal`, then `scripts/crop-universal.sh <universal.png> <header.png> <search-results.png>` (3:2 crop → 3840x2560). Do not use the cropped header.
- Bezels: `/Library/Developer/DeviceKit/Chrome/phone11.devicechrome` (18 Pro) or `phone12` (18 Pro Max), `Resources/PhoneComposite.pdf`.

### Mac header and search results

- Header: the same wordmark file as iOS.
- Search results: `compose-mac <window.png> <icon.png> <universal.png> 5244 2950 universal`, then `scripts/crop-universal.sh <universal.png> <header.png> <search-results.png>`.
- `compose-mac <window.png> <icon.png> <out.png> <W> <H> <kind>`, built from `scripts/compose-mac.swift`. Kinds: `store` (2880x1800 Mac App Store shot: window 71.5 % wide on the gradient), `universal`, `screenshot` (window 90 % on black, no shadow).
- Output has no alpha.

### Play feature graphic

- `scripts/compose-android-feature.swift <android/phone notices> <android/phone courses> <icon.png> <out> [1024 500]`, icon from `docs/assets/logo.webp`; rendered at 4x, no alpha. Phones are full height (bleeding off top and bottom); the smaller icon and gaps leave ~11 % horizontal margin on both sides.
- Output: `android/play-feature-graphic.png`.

## README screenshots

- `cwebp -q 90` the iPhone shot; the Mac window PNG with `-alpha_q 100`. Keep the `<img>` sizes in `README.md`.
- Output: `readme/`, keeping the screen's `NN-<slug>` name with the converted extension (`.webp` or `.png`).
