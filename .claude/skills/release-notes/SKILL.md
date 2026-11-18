---
name: release-notes
description: Write learnX release notes since the last tag, as separate texts for GitHub Releases (with the Windows and Linux app), Google Play, App Store (iOS) and Mac App Store. Use when asked to write or draft release notes for a new version.
---

# Release notes for learnX

1. Find the last tag (`git tag --sort=-creatordate | head`) and read `git log <tag>..HEAD`. Read the previous releases (`gh release list`, `gh release view <tag> --json body -q .body`) to match their style.
2. Compare against the last tag's code, not the commit titles: a feature that already existed is "Improve" (改进), and a bug that only existed between the tag and HEAD isn't a fix to list. Skip changes users can't see: mock login/data, skills and scripts, release tooling (fastlane), version bumps, dependency updates.
3. For each user-visible commit, check `git show --stat` to decide which platforms it affects. Patches in `patches/` can be platform-specific (look at the files they touch, e.g. `android/` vs `ios/`). Shared-code changes need a look at the code: `isApple()` / `isAndroid()` / `isElectron()` branches, `.android.tsx` / `.web.tsx` files, iOS-version gates, iPad/Mac-only features. `electron/` is the Windows and Linux app only.
4. Save to the path you were given (`bundle exec fastlane notes` asks for `build/release/v<version>/release-notes.md`), else the scratchpad (never a tracked file in the repo), as one markdown file with four sections separated by `====` lines, in this order and without section titles: GitHub Releases, Google Play, App Store (iOS), Mac App Store. `bundle exec fastlane release notes:<file>` reads it in that shape (see the release skill). Don't publish or upload anything unless asked.

## Format

- **GitHub Releases** (full list, all platforms; say "on Android" etc. for platform-specific items, and "on Windows and Linux" for the Electron app's): Chinese block first, `---`, then English block. Each starts with the maintainers banner as in the previous release (`> learnX 诚邀维护者！…` / `> learnX is looking for maintainers! …`), then `# 功能` / `# 修复` and `# Features` / `# Fixes`. Install instructions don't go in release notes; the README has them. In a big release, group features under `##` areas, newest platforms and the redesign first.
- **Google Play** (Android items only), **App Store (iOS)** and **Mac App Store (macOS)** (only items affecting that platform; Windows and Linux items never go in them): **English (en-US) first, a `---` line, then Chinese** (zh-CN for Play, zh-Hans for the stores). Play allows 500 characters per language. No banner. All platforms ship under the same tag, so when a store has no items of its own, still write a generic `# Fixes` / `# 修复` entry ("Fix minor issues." / "修复若干小问题。") instead of leaving it empty. Each language block still has a `# Fixes` / `# 修复` and/or `# Features` / `# 功能` heading; omit a heading with no items.
- Write the Chinese first, in natural Chinese, then the English from it; never translate the Chinese from the English. Chinese text uses full-width punctuation (，。) only. Every text types a space between Chinese and Latin letters or digits (`支持 Windows 和 Linux`), since neither GitHub nor the stores draw a gap (`translations/AGENTS.md`).
- Bullets are short, start with "Fix"/"Add"/"Improve" (修复/新增/改进), one change each.
