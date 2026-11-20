---
name: release-notes
description: Write learnX release notes since the last tag, as separate texts for GitHub Releases (with the Windows and Linux app), Google Play, App Store (iOS) and Mac App Store. Use when asked to write or draft release notes for a new version.
---

# Release notes for learnX

1. Fetch tags first (`git fetch --tags origin`; publishing a GitHub release makes its tag on GitHub only), then find the last tag (`git tag --sort=-creatordate | head`) and read `git log <tag>..HEAD`. Read the previous releases (`gh release list`, `gh release view <tag> --json body -q .body`) to match their style.
2. Compare against the last tag's code, not the commit titles: a feature that already existed is "Improve" (改进), and a bug that only existed between the tag and HEAD isn't a fix to list. Skip changes users can't see: mock login/data, skills and scripts, release tooling (fastlane), version bumps, dependency updates.
3. For each user-visible commit, check `git show --stat` to decide which platforms it affects. Patches in `patches/` can be platform-specific (look at the files they touch, e.g. `android/` vs `ios/`). Shared-code changes need a look at the code: `isApple()` / `isAndroid()` / `isElectron()` branches, `.android.tsx` / `.web.tsx` files, iOS-version gates, iPad/Mac-only features. `electron/` is the Windows and Linux app only.
4. Save to the path you were given (`bundle exec fastlane notes` asks for `build/release/v<version>/release-notes.md`), else the scratchpad (never a tracked file in the repo), as one markdown file in the shape below. `bundle exec fastlane release notes:<file>` reads it by its labels (see the release skill). Don't publish or upload anything unless asked.

## File shape

Four sections, each opened by its label line exactly as written here, in this order. Inside each store section, a `---- English (en-US) ----` block first (the stores show English first, so it's filled in first), then a `---- 中文（<locale>）----` block. Leave a blank line around every label line.

```
==== GitHub Releases ====

> learnX 诚邀维护者！…

# 功能
…

---

> learnX is looking for maintainers! …

# Features
…

==== Google Play ====

---- English (en-US) ----

# Features
…

---- 中文（zh-CN）----

# 功能
…

==== App Store (iOS) ====

---- English (en-US) ----
…

---- 中文（zh-Hans）----
…

==== Mac App Store ====

---- English (en-US) ----
…

---- 中文（zh-Hans）----
…
```

What each section is for:

- **GitHub Releases**: the release page, which ships the Windows and Linux app and the Android APKs (for people without Google Play). Full list, all platforms; say "on Android" / “Android 上” etc. for platform-specific items, and "on Windows and Linux" / “Windows 和 Linux 上” for the Electron app's. Chinese block first, a `---` line, then English. Each starts with the maintainers banner as in the previous release, then `# 功能` / `# 修复` and `# Features` / `# Fixes`. In a big release, group features under `##` areas, newest platforms and the redesign first.
- **Google Play** (Android only), **App Store (iOS)** (iPhone and iPad) and **Mac App Store** (macOS): only items affecting that platform, with no "on Android"-style qualifiers since the store already says which. Windows and Linux items never go in them, and the App Store and Mac App Store texts never mention Android or Google Play (App Review guideline 2.3.10). Play allows 500 characters per language. No banner. All platforms ship under the same tag, so when a store has no items of its own, still write a generic `# 修复` / `# Fixes` entry (“修复若干小问题。” / "Fix minor issues.") instead of leaving it empty. Each language block still has a `# 功能` / `# 修复` heading and/or `# Features` / `# Fixes`; omit a heading with no items.

## Writing

- Install instructions don't go in release notes; the README has them.
- Write the Chinese first, in natural Chinese, then the English from it; never translate the Chinese from the English. Chinese text uses full-width punctuation (，。) only. Every text types a space between Chinese and Latin letters or digits (`支持 Windows 和 Linux`), since neither GitHub nor the stores draw a gap (`src/assets/translations/AGENTS.md`).
- Bullets are short, start with "Fix"/"Add"/"Improve" (修复/新增/改进), one change each.
