---
name: release-notes
description: Write learnX release notes since the last tag, as separate texts for GitHub Releases, Google Play, App Store (iOS) and Mac App Store. Use when asked to write or draft release notes for a new version.
---

# Release notes for learnX

1. Find the last tag (`git tag --sort=-creatordate | head`) and read `git log <tag>..HEAD`. Read the previous releases (`gh release list`, `gh release view <tag> --json body -q .body`) to match their style.
2. Skip changes users can't see: mock login/data, skills and scripts, APK publishing, version bumps, dependency updates.
3. For each user-visible commit, check `git show --stat` to decide which platforms it affects. Patches in `patches/` can be platform-specific (look at the files they touch, e.g. `android/` vs `ios/`). Shared-code changes need a look at the code: `Platform.OS` checks, iOS-version gates, iPad/Mac-only features.
4. Save to the scratchpad (never the repo) as one markdown file with four sections separated by `====` lines. Don't publish or upload anything unless asked.

## Format

- **GitHub Releases** (full list, all platforms; say "on Android" etc. for platform-specific items): Chinese block first, `---`, then English block. Each starts with the maintainers banner as in the previous release (`> learnX 诚邀维护者！…` / `> learnX is looking for maintainers! …`), then `# 功能` / `# 修复` and `# Features` / `# Fixes`.
- **Google Play** (Android items only), **App Store (iOS)** and **Mac App Store (macOS)** (only items affecting that platform): **English (en-US) first, then Chinese** (zh-CN for Play, zh-Hans for the stores). No banner. Each language block still has a `# Fixes` / `# 修复` and/or `# Features` / `# 功能` heading; omit a heading with no items.
- Chinese text uses full-width punctuation (，。) only.
- Bullets are short, start with "Fix"/"Add"/"Improve" (修复/新增/改进), one change each.
