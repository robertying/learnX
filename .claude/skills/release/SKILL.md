---
name: release
description: Bump the learnX version, build release binaries (iOS, Mac, Android, and the Windows and Linux app) and upload them to App Store Connect, Google Play and GitHub with fastlane. Use when asked to cut, build or upload a release.
---

# Releasing learnX

A release runs on a Mac with [fastlane](https://docs.fastlane.tools) (`fastlane/Fastfile`; `bundle exec fastlane lanes` lists every lane and its options). Follow the steps in order. Each one says what it needs from the person; everything else runs without asking.

- Don't upload, submit or publish anything unless asked. Build lanes and `preflight` are safe to run.
- Don't change release tooling (the Fastfile, `scripts/release`, this skill) in the middle of a release, and never on the release commit. When something in it is wrong, work around it, write down what happened and how, and fix it afterwards in a pull request.
- Keep a short journal of the run in `build/release/v<version>/release-journal.md`: what ran, what failed, what was skipped. The next release starts from it.
- Run each fastlane lane as its own command (`bundle exec fastlane ios build`). Don't loop over lane names held in one string: zsh doesn't split them.
- Long lanes (a build is 10 to 30 minutes per platform) run in the background, with their output in a log file.

## 1. Set up the checkout

- `bundle install` once (the Ruby in `.ruby-version`, e.g. Homebrew's), then `pnpm install` and `cd ios && bundle exec pod install` (the locked CocoaPods and `Podfile.lock`; not `pnpm pod:update`, which also updates pods).
- Secrets go in `fastlane/.env` (git-ignored; fastlane loads it); the `ENV` reads in `fastlane/Fastfile` are the keys it takes. Android signing reads `android/local.properties` (copy its `.example`) and `android/app/release.keystore`.
- The build lanes need the repo-root `.env` with the mock login (`DUMMY_USERNAME`, `DUMMY_PASSWORD`; `babel/inline-env.js` inlines it). A worktree has none: copy it from the main checkout. After building, the lanes check that each JS bundle has the mock login and no other `.env` value.

## 2. Prepare the release commit

- A feature release gets What's New highlights: an entry for its version at the top of `releases` in `src/helpers/whatsNew.ts` (its types say what a row takes; mark rows that need the new native code with `minNative`, and rows only some platforms have with `platforms`). A bug-fix release gets none: it shows no What's New, and its notes are in Settings › Changelog.
- If the release changes native code since the last one, the over-the-air runtime version in `app.json` is the new version, recorded in `ota-fingerprint.json` (CI's "Runtime version" check says when, and prints the values; "Over-the-air updates" in `AGENTS.md`). A JS-only release keeps it. The build lanes refuse the placeholder update URL in `app.json`.
- `pnpm bump major|minor|patch` or `pnpm bump x.y.z` sets the version and build number on every platform (Electron included: `electron/buildInfo.ts` reads `package.json` and the Xcode project); `pnpm bump build` (or `pnpm bump` alone) is a rebuild of the same version. A new version moves the build number to the next multiple of 10, a rebuild adds 1, and both start above the highest build App Store Connect and Google Play already have, since builds uploaded between releases take numbers too. `--build <number>` sets it by hand; `--offline` skips asking the stores. `scripts/release/bump.sh` says how the numbers are derived.
- Commit and push, so the release commit is on `origin/main`: the GitHub release points at it, and the Electron update test runs on it.

## 3. Write the notes

- `bundle exec fastlane notes` (after `bump`) runs the release-notes skill through `claude -p` with read-only git and gh tools and saves `build/release/v<version>/release-notes.md`, which the release lanes use when no `notes:` is given. It refuses a version that's already tagged. Without the `claude` CLI (or logged out, or with `claude:false`) it writes a draft with the commits since the last tag and `TODO(release-notes)` placeholders, which the release lanes refuse.
- **Ask the person to review the notes** before uploading, and whether the stores should get them: when the store text is already set by hand, upload with `store_notes:false`, which keeps the stores' text and still puts the notes on the GitHub release. `notes:none` uploads no text anywhere. A lane run without a terminal stops when there are no notes rather than uploading none.

## 4. Preflight

`bundle exec fastlane preflight` checks, in about a minute, everything the release needs besides the builds: a clean tree at a commit on `origin/main` with green CI, versions in sync and not yet tagged, a build number above every uploaded build (which also proves the App Store Connect and Play keys work), Android signing, `.env`, the notes, a What's New entry for a feature release, free disk space, and for Windows and Linux the update signing key and a passing update test. Fix every ✗ before building. `electron:false` leaves out Windows and Linux.

- It reads the Electron update signing key from 1Password (`op read` at `LEARNX_UPDATE_SIGNING_KEY_REF`), so **tell the person to approve the 1Password prompt** first; it gives up after about a minute. The 1Password app's CLI integration has to be on.
- The update test: `bundle exec fastlane electron update_e2e` starts the Electron workflow by hand on `main` (which must be the release commit) and waits for its `Update E2E tests` jobs, Windows and Linux, which install an older test version, serve a newer one and check that the app updates from Settings ("Packaging and updates" in `electron/AGENTS.md`). Start it right after pushing (`wait:false` doesn't wait) so it runs while the apps build. `pnpm e2e:electron:update` on a Windows or Linux computer where learnX isn't installed runs the same test.

## 5. Build

`bundle exec fastlane build` builds everything into `build/release/v<version>/` without uploading: iOS, Mac, Android, then Windows and Linux (`electron:false` skips those; a failed Electron build leaves the others). `<ios|mac|android|electron> build` builds one.

- iOS and Mac: the store binaries, and every dSYM in the archive zipped next to them and uploaded to Crashlytics (`bundle exec fastlane <ios|mac> symbols` uploads them again, e.g. after a network failure). Android: the AAB, the self-updating APKs with `latest.json` ("Updating the Android app" in `modules/AGENTS.md`), and native symbols uploaded to Crashlytics. `bundle exec fastlane android install_bundle` installs that AAB on the connected device through `bundletool` (`brew install bundletool`), split the way Google Play splits it.
- Each build keeps its JS source map in `sourcemaps/` (earlier builds' maps of the version are removed). Crashlytics doesn't symbolicate JS, so these are kept: `bundle exec fastlane symbolicate` decodes a report's stack with them ("Crash reporting" in `modules/AGENTS.md`).
- Each build writes `build.json` next to its output: the commit, version, build number and the SHA-256 of each file. The upload lanes take only a build of HEAD, from a clean tree, whose files haven't changed since, so nothing is rebuilt to upload it.
- Windows and Linux: the installers, `latest*.yml` and `.blockmap`s in `electron/`, packaged on this Mac, or copied with `from:/path/to/win,/path/to/linux` from folders built elsewhere with `pnpm electron:package` (`platforms:win` or `platforms:linux` for one). The lane refuses update files for another version, an installer an update file names that's missing or has another SHA-512, and installers whose names carry another version. No macOS build: the Mac has the Catalyst app. CI's `Electron / Installers` only checks that packaging works; its artifacts are never released.

## 6. Upload

Only when asked. `bundle exec fastlane release` uploads all of it: iOS and Mac to App Store Connect (not submitted for review), the AAB to Google Play as a draft on `track:` (default `production`), and a draft GitHub release `v<version>` at HEAD with the APKs, `latest.json` and a zip of the source maps. It uses the builds from step 5 and builds only what's missing or stale (`rebuild:true` builds everything again). Add `electron:true` to sign the Windows and Linux files and put them on the same release. The release lanes need a clean tree.

- One target at a time: `<ios|mac|android> upload` uploads that build, never building; `github_release` makes the draft GitHub release; `electron upload` adds the signed Windows and Linux files to it (and refuses a published one). `<platform> release` builds if needed and uploads.
- `bundle exec fastlane electron sign` signs the update files by hand, with the key from 1Password (or `key:` / `LEARNX_UPDATE_SIGNING_KEY` for a file), writing a `.sig` next to each `latest*.yml`. The app downloads nothing whose update file has no valid signature by the Electron update key ("Packaging and updates" in `electron/AGENTS.md`): without the `.sig` files, installs stay on their version until a signed one is out (new downloads still work), and without the `latest*.yml` files the mirror offers no Windows or Linux update. Sign again after any change to a `latest*.yml`. The signing script refuses an update file for another version and a placeholder key.
- Windows and Linux are best effort: a mobile release never waits on them.

## 7. After uploading

- TestFlight's What to Test uses the same notes as the store: once App Store Connect has processed an upload (a few minutes), `bundle exec fastlane <ios|mac> testflight_notes` sets it for this version's build (`build:` for another one) from the iOS or Mac section, or from `what_to_test:<text>` (both languages) for a build between releases. It uploads nothing and notifies no one.
- External testers get a build only after Beta App Review: `bundle exec fastlane <ios|mac> beta_review` (same `build:`, `notes:` and `what_to_test:` options) sets What to Test, submits the processed build for review, and adds it to the external TestFlight groups named by `groups:<name,...>` or `TESTFLIGHT_EXTERNAL_GROUPS` in `fastlane/.env`. Testers are notified when Apple approves it. It never submits for App Store review. Run it only when asked.
- Hand the person what's left for them, with links: submit iOS and Mac for review in App Store Connect, roll out the Play draft, and publish the GitHub draft together with the mobile releases. The TUNA mirror copies only published releases, on its schedule, so every file must be on the draft before it's published; a file added later reaches users only at the mirror's next copy.
- Install instructions (Windows SmartScreen, the AppImage and the .deb) live in the README, not in the release notes.
