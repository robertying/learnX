require "minitest/autorun"
require "digest"
require "fileutils"
require "json"
require "tmpdir"
require_relative "../release"

ROOT = File.expand_path("../..", __dir__)

def notes_text(play_en: "- Fix minor issues.")
  store = lambda do |en|
    <<~STORE
      ---- English (en-US) ----

      #{en}

      ---- 中文（zh-Hans）----

      - 修复若干小问题。
    STORE
  end
  <<~NOTES
    <!-- written by the release-notes skill -->
    ==== GitHub Releases ====

    # 修复

    - 修复若干小问题。

    ==== Mac App Store ====

    #{store.call('- Mac fixes.')}
    ==== Google Play ====

    #{store.call(play_en)}
    ==== App Store (iOS) ====

    #{store.call('- iOS fixes.')}
  NOTES
end

class OffTest < Minitest::Test
  def test_off_values
    [false, "false", "no", "0", "NO"].each { |value| assert Release.off?(value), value.inspect }
    [nil, true, "true", "yes", "", "linux"].each { |value| refute Release.off?(value), value.inspect }
  end
end

class VersionsTest < Minitest::Test
  PBXPROJ = <<~PBX
    CURRENT_PROJECT_VERSION = 4560;
    MARKETING_VERSION = 19.0.0;
    CURRENT_PROJECT_VERSION = 4560;
    MARKETING_VERSION = 19.0.0;
  PBX
  GRADLE = %(versionCode = 9204560\nversionName = "19.0.0"\n)

  def test_in_sync
    assert_equal [], Release.version_problems("19.0.0", PBXPROJ, GRADLE)
  end

  def test_the_repo_is_in_sync
    version = JSON.parse(File.read(File.join(ROOT, "package.json")))["version"]
    pbxproj = File.read(File.join(ROOT, "ios/learnX.xcodeproj/project.pbxproj"))
    gradle = File.read(File.join(ROOT, "android/app/build.gradle"))
    assert_equal [], Release.version_problems(version, pbxproj, gradle)
    assert_operator Release.build_numbers(pbxproj).size, :>=, 3, "the app, the share extension and the widgets"
  end

  def test_each_setting_out_of_step
    widget_behind = PBXPROJ.sub(/4560;(?=\nMARKETING_VERSION = 19.0.0;\n\z)/, "4559;")
    assert_equal ["ios CURRENT_PROJECT_VERSION (4560, 4559)"], Release.version_problems("19.0.0", widget_behind, GRADLE)
    assert_equal ["ios MARKETING_VERSION", "android versionName"], Release.version_problems("19.1.0", PBXPROJ, GRADLE)
    assert_equal ["android versionCode"], Release.version_problems("19.0.0", PBXPROJ, GRADLE.sub("9204560", "9204550"))
  end

  def test_next_build
    assert_equal 4570, Release.next_build(4560, built: false)
    assert_equal 4570, Release.next_build(4562, built: false)
    assert_equal 4561, Release.next_build(4560, built: true)
    assert_equal 4563, Release.next_build(4562, built: true)
  end

  def test_version_bump_only_after_the_version_shipped
    assert_nil Release.version_bump_problem("19.0.0", "19.1.0", released: true)
    assert_match(/hasn't shipped to production/, Release.version_bump_problem("19.1.0", "19.2.0", released: false))
    assert_match(/already 19.1.0/, Release.version_bump_problem("19.1.0", "19.1.0", released: true))
    assert_match(/isn't above/, Release.version_bump_problem("19.1.0", "19.0.9", released: true))
    assert_match(/isn't above/, Release.version_bump_problem("19.10.0", "19.9.0", released: true))
    assert_match(/Invalid version/, Release.version_bump_problem("19.1.0", "19.2", released: true))
  end

  def test_android_version_code
    assert_equal 9_204_530, Release.android_version_code(4530)
  end

  def texts
    { package_json: %({\n  "version": "19.0.0",\n  "dependencies": { "x": "19.0.0" }\n}\n), pbxproj: PBXPROJ, gradle: GRADLE }
  end

  def test_bump_texts_move_only_the_version
    bumped = Release.bump_texts(texts, from: "19.0.0", to: "19.1.0")
    assert_equal texts[:package_json].sub(%("version": "19.0.0"), %("version": "19.1.0")), bumped[:package_json]
    assert_equal PBXPROJ.gsub("19.0.0", "19.1.0"), bumped[:pbxproj]
    assert_equal %(versionCode = 9204560\nversionName = "19.1.0"\n), bumped[:gradle]
    assert_equal [], Release.version_problems("19.1.0", bumped[:pbxproj], bumped[:gradle])
  end

  def test_bump_refuses_files_out_of_step
    error = assert_raises(Release::Error) { Release.bump_texts(texts.merge(gradle: GRADLE.sub("19.0.0", "18.0.0")), from: "19.0.0", to: "19.1.0") }
    assert_equal %(Expected 1 × "versionName = \\"19.0.0\\"" in build.gradle, found 0), error.message
    one_behind = PBXPROJ.sub(/19.0.0;\n\z/, "18.0.0;\n")
    assert_raises(Release::Error) { Release.bump_texts(texts.merge(pbxproj: one_behind), from: "19.0.0", to: "19.1.0") }
  end

  def test_the_repo_bumps_cleanly
    files = { package_json: "package.json", pbxproj: "ios/learnX.xcodeproj/project.pbxproj", gradle: "android/app/build.gradle" }
    repo = files.transform_values { |path| File.read(File.join(ROOT, path)) }
    version = JSON.parse(repo[:package_json])["version"]
    bumped = Release.bump_texts(repo, from: version, to: "99.0.0")
    assert_equal "99.0.0", JSON.parse(bumped[:package_json])["version"]
    assert_equal [], Release.version_problems("99.0.0", bumped[:pbxproj], bumped[:gradle])
  end

  # Release builds pass their number to Gradle; build.gradle must use it.
  def test_gradle_takes_the_release_build_number
    gradle = File.read(File.join(ROOT, "android/app/build.gradle"))
    assert_includes gradle, %(findProperty("learnxBuildNumber"))
    assert_includes gradle, "versionCode = 9_200_000 + (releaseBuild as int)"
  end
end

class NotesTest < Minitest::Test
  def test_parses_every_section_in_any_order
    notes = Release.parse_notes(notes_text, "notes.md")
    assert_equal "# 修复\n\n- 修复若干小问题。", notes[:github]
    assert_equal({ en: "- Fix minor issues.", zh: "- 修复若干小问题。" }, notes[:play])
    assert_equal "- iOS fixes.", notes[:ios][:en]
    assert_equal "- Mac fixes.", notes[:mac][:en]
  end

  def test_refuses_placeholders
    error = assert_raises(Release::Error) { Release.parse_notes(notes_text(play_en: "- #{Release::NOTES_TODO}"), "notes.md") }
    assert_match "placeholders", error.message
  end

  def test_refuses_a_missing_or_unknown_section
    missing = notes_text.sub("==== Mac App Store ====", "")
    assert_match "Mac App Store", assert_raises(Release::Error) { Release.parse_notes(missing, "notes.md") }.message
    unknown = notes_text.sub("==== Mac App Store ====", "==== macOS ====")
    assert_match "macOS", assert_raises(Release::Error) { Release.parse_notes(unknown, "notes.md") }.message
  end

  def test_refuses_a_store_section_without_both_languages
    one_language = notes_text.sub(/---- 中文（zh-Hans）----\n\n- 修复若干小问题。\n\n==== Google Play/, "==== Google Play")
    error = assert_raises(Release::Error) { Release.parse_notes(one_language, "notes.md") }
    assert_match "Mac App Store notes need", error.message
  end

  def test_play_limit
    assert Release.parse_notes(notes_text(play_en: "a" * 500), "notes.md")
    error = assert_raises(Release::Error) { Release.parse_notes(notes_text(play_en: "a" * 501), "notes.md") }
    assert_match "501 characters", error.message
  end

  def test_fallback_draft
    subjects = ["Say when a PDF needs a password (#1748)\n", "Bump version\n", "Update the release skill\n", "\n"]
    draft = Release.fallback_notes(subjects, "v19.0.0")
    assert_includes draft, "Commits since v19.0.0"
    assert_includes draft, "- Say when a PDF needs a password (#1748)"
    assert_includes draft, "- Say when a PDF needs a password\n"
    refute_includes draft, "Bump version"
    refute_includes draft, "release skill"
    assert_equal Release::NOTES_SECTIONS.sort, Release.notes_sections(draft, "draft").keys.sort
    # The lanes won't upload it until every placeholder is filled in.
    assert_raises(Release::Error) { Release.parse_notes(draft, "draft") }
  end

  def test_fallback_draft_without_commits_or_tag
    draft = Release.fallback_notes([], nil)
    assert_includes draft, "Commits since the first commit"
    assert_includes draft, "# Features\n\n- #{Release::NOTES_TODO}"
  end
end

class BuildRecordTest < Minitest::Test
  def setup
    @dir = Dir.mktmpdir
    @apk = File.join(@dir, "android/learnX.apk")
    FileUtils.mkdir_p(File.dirname(@apk))
    File.write(@apk, "apk")
    @record = JSON.parse(JSON.generate(Release.build_record(
      platform: "android", version: "19.1.0", build: 4570, commit: "a" * 40, dirty: false,
      out_dir: @dir, files: [@apk], extra: { platforms: ["linux"] },
    )))
  end

  def teardown
    FileUtils.rm_rf(@dir)
  end

  def problem(record = @record, version: "19.1.0", build: 4570, head: "a" * 40)
    Release.build_record_problem(record, platform: "android", version: version, build: build, head: head, out_dir: @dir)
  end

  def test_records_files_under_the_output_folder
    assert_equal({ "android/learnX.apk" => Digest::SHA256.hexdigest("apk") }, @record["files"])
    assert_equal ["linux"], @record["platforms"]
  end

  def test_a_matching_build
    assert_nil problem
  end

  def test_what_makes_a_build_unusable
    assert_equal "no android build of v19.1.0 yet", problem(nil)
    assert_match "is v19.1.0 (4570), not v19.1.0 (4571)", problem(build: 4571)
    assert_match "is of aaaaaaaa, not HEAD bbbbbbbb", problem(head: "b" * 40)
    assert_match "uncommitted changes", problem(@record.merge("dirty" => true))
    File.write(@apk, "changed")
    assert_match "android/learnX.apk changed or went missing", problem
    File.delete(@apk)
    assert_match "android/learnX.apk changed or went missing", problem
  end
end

class ElectronTest < Minitest::Test
  def setup
    @dir = Dir.mktmpdir
  end

  def teardown
    FileUtils.rm_rf(@dir)
  end

  def installer(name, contents = name)
    File.write(File.join(@dir, name), contents)
    Digest::SHA512.base64digest(contents)
  end

  def update_file(name, version, file, sha512)
    File.write(File.join(@dir, name), <<~YML)
      version: #{version}
      files:
        - url: #{file}
          sha512: #{sha512}
          size: 1
      path: #{file}
      sha512: #{sha512}
      releaseDate: '2026-11-20T00:00:00.000Z'
    YML
  end

  def linux(version = "19.1.0")
    update_file("latest-linux.yml", version, "learnX-linux-x86_64-v19.1.0.AppImage", installer("learnX-linux-x86_64-v19.1.0.AppImage"))
    update_file("latest-linux-arm64.yml", version, "learnX-linux-arm64-v19.1.0.AppImage", installer("learnX-linux-arm64-v19.1.0.AppImage"))
    installer("learnX-linux-amd64-v19.1.0.deb")
  end

  def test_platforms
    assert_equal %w[win linux], Release.electron_platforms(nil)
    assert_equal %w[linux], Release.electron_platforms("linux")
    assert_match "Unknown platforms: mac", assert_raises(Release::Error) { Release.electron_platforms("linux,mac") }.message
  end

  def test_update_entries
    text = "version: '19.1.0'\nfiles:\n  - url: a.exe\n    sha512: abc\n    size: 1\npath: a.exe\nsha512: abc\n"
    assert_equal({ version: "19.1.0", files: ["a.exe"], sha512: { "a.exe" => "abc" } }, Release.electron_update_entries(text))
  end

  def test_a_good_folder
    linux
    assert_equal [], Release.electron_file_problems(@dir, %w[linux], "19.1.0")
  end

  def test_windows_missing
    linux
    assert_equal ["latest.yml is missing"], Release.electron_file_problems(@dir, %w[win linux], "19.1.0")
  end

  def test_another_version
    linux("19.0.0")
    problems = Release.electron_file_problems(@dir, %w[linux], "19.1.0")
    assert_includes problems, 'latest-linux.yml is for version "19.0.0", not 19.1.0'
  end

  def test_a_changed_or_missing_installer
    linux
    File.write(File.join(@dir, "learnX-linux-x86_64-v19.1.0.AppImage"), "rebuilt")
    File.delete(File.join(@dir, "learnX-linux-arm64-v19.1.0.AppImage"))
    assert_equal [
      "learnX-linux-x86_64-v19.1.0.AppImage's SHA-512 doesn't match latest-linux.yml",
      "latest-linux-arm64.yml names learnX-linux-arm64-v19.1.0.AppImage, which is missing",
    ], Release.electron_file_problems(@dir, %w[linux], "19.1.0")
  end

  def test_debs
    linux
    installer("learnX-linux-arm64-v19.0.0.deb")
    assert_equal ["learnX-linux-arm64-v19.0.0.deb isn't version 19.1.0"], Release.electron_file_problems(@dir, %w[linux], "19.1.0")
    Dir[File.join(@dir, "*.deb")].each { |deb| File.delete(deb) }
    assert_equal ["no .deb for Linux"], Release.electron_file_problems(@dir, %w[linux], "19.1.0")
  end
end

class GitHubTest < Minitest::Test
  def test_release_state
    assert_equal :draft, Release.github_release_state("v19.1.0", true, "true\n", "")
    assert_equal :published, Release.github_release_state("v19.1.0", true, "false\n", "")
    assert_equal :none, Release.github_release_state("v19.1.0", false, "", "release not found\n")
    error = assert_raises(Release::Error) { Release.github_release_state("v19.1.0", false, "", "HTTP 401: Bad credentials\n") }
    assert_equal "Couldn't look up the v19.1.0 release on GitHub: HTTP 401: Bad credentials", error.message
  end

  def run_of(name, status: "completed", conclusion: "success")
    { "name" => name, "status" => status, "conclusion" => conclusion }
  end

  def test_ci_problem
    sha = "abcdef0123456789"
    assert_equal "no CI runs on abcdef01", Release.ci_problem([], sha)
    assert_nil Release.ci_problem([run_of("Checks"), run_of("E2E tests", conclusion: "skipped")], sha)
    assert_equal "still running on abcdef01: Build", Release.ci_problem([run_of("Checks"), run_of("Build", status: "in_progress", conclusion: nil)], sha)
    assert_equal "failed on abcdef01: E2E tests (Linux)",
                 Release.ci_problem([run_of("E2E tests (Linux)", conclusion: "failure"), run_of("Build", status: "queued", conclusion: nil)], sha)
  end

  def test_update_e2e_passed
    assert Release.update_e2e_passed?([run_of("Web build"), run_of("Update E2E tests (Linux)"), run_of("Update E2E tests (Windows)")])
    refute Release.update_e2e_passed?([run_of("Update E2E tests (Linux)")])
    refute Release.update_e2e_passed?([run_of("Update E2E tests (Linux)"), run_of("Update E2E tests (Windows)", conclusion: "failure")])
    refute Release.update_e2e_passed?([run_of("Update E2E tests", conclusion: "skipped"), run_of("Web build")])
  end
end

class FailWithTest < Minitest::Test
  def teardown
    Release.fail_with { |message| raise Release::Error, message }
  end

  def test_a_lane_sets_how_checks_fail
    stopped = Class.new(StandardError)
    Release.fail_with { |message| raise stopped, "lane: #{message}" }
    assert_equal "lane: Unknown platforms: mac (win, linux)", assert_raises(stopped) { Release.electron_platforms("mac") }.message
  end
end
