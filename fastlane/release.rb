require "digest"
require "json"

# The Fastfile's checks and file formats that don't need fastlane, Git, the
# network or a build: versions, release notes, build records, the Electron
# update files and what GitHub says about a release or a commit. The Fastfile
# reads the files and runs the commands; this decides what they mean, so
# fastlane/test can test it with plain Ruby.
module Release
  Error = Class.new(StandardError)

  # How a failed check stops the lane. The Fastfile sets fastlane's
  # UI.user_error!, which prints the message without a stack trace.
  @fail = ->(message) { raise Error, message }

  def self.fail_with(&block)
    @fail = block
  end

  def self.fail!(message)
    @fail.call(message)
    raise Error, message
  end

  # A lane option that turns something off: fastlane passes `false` for
  # `name:false`, and a string for anything else.
  def self.off?(value)
    %w[false no 0].include?(value.to_s.downcase)
  end

  # ---------------------------------------------------------------------------
  # Versions

  # The Android versionCode is this plus the iOS build number (18.0.3: 4530 -> 9204530).
  ANDROID_VERSION_CODE_BASE = 9_200_000

  def self.android_version_code(build)
    ANDROID_VERSION_CODE_BASE + build
  end

  # CURRENT_PROJECT_VERSION: the project level sets it for the app and the
  # share extension, and the widget target sets its own. All of them must match.
  def self.build_numbers(pbxproj)
    pbxproj.scan(/CURRENT_PROJECT_VERSION = (\d+);/).flatten.map(&:to_i)
  end

  def self.marketing_version_count(pbxproj)
    pbxproj.scan(/MARKETING_VERSION = [\d.]+;/).size
  end

  # What's out of step with package.json's version and the build number, as
  # names of the settings; none when everything matches.
  def self.version_problems(version, pbxproj, gradle)
    builds = build_numbers(pbxproj)
    problems = []
    problems << "ios MARKETING_VERSION" unless pbxproj.scan(/MARKETING_VERSION = #{Regexp.escape(version)};/).size == marketing_version_count(pbxproj)
    problems << "ios CURRENT_PROJECT_VERSION (#{builds.uniq.join(', ')})" unless builds.uniq.size == 1
    problems << "android versionName" unless gradle.include?(%(versionName = "#{version}"))
    problems << "android versionCode" unless gradle.include?("versionCode = #{android_version_code(builds.max.to_i)}")
    problems
  end

  # The build number `bump` moves to: a new version starts at the next
  # multiple of 10, a rebuild of the same version adds 1, and both start above
  # every build the stores already have (`uploaded`, nil when unknown).
  def self.next_build(current_version, version, build, uploaded = nil)
    step = ->(base) { version == current_version ? base + 1 : (base / 10 + 1) * 10 }
    candidate = step.call(build)
    uploaded && uploaded >= candidate ? step.call(uploaded) : candidate
  end

  # The version files' texts moved from `from` to `to` ([version, build]
  # pairs), checking each setting is replaced as many times as it appears.
  def self.bump_texts(texts, from:, to:)
    (from_version, from_build), (to_version, to_build) = from, to
    package_json, pbxproj, gradle = texts.values_at(:package_json, :pbxproj, :gradle)
    {
      package_json: replace(package_json, "package.json", %("version": "#{from_version}"), %("version": "#{to_version}"), 1),
      pbxproj: replace(
        replace(pbxproj, "project.pbxproj", "MARKETING_VERSION = #{from_version};", "MARKETING_VERSION = #{to_version};", marketing_version_count(pbxproj)),
        "project.pbxproj", "CURRENT_PROJECT_VERSION = #{from_build};", "CURRENT_PROJECT_VERSION = #{to_build};", build_numbers(pbxproj).size
      ),
      gradle: replace(
        replace(gradle, "build.gradle", %(versionName = "#{from_version}"), %(versionName = "#{to_version}"), 1),
        "build.gradle", "versionCode = #{android_version_code(from_build)}", "versionCode = #{android_version_code(to_build)}", 1
      ),
    }
  end

  def self.replace(text, name, from, to, count)
    found = text.scan(from).size
    fail!("Expected #{count} × #{from.inspect} in #{name}, found #{found}") unless found == count
    text.gsub(from, to)
  end
  private_class_method :replace

  # ---------------------------------------------------------------------------
  # Release notes (written by the release-notes skill)
  #
  # Four labeled sections, each opened by a `==== <name> ====` line (any order):
  # GitHub Releases, Google Play, App Store (iOS), Mac App Store. Each store
  # section has a `---- English ----` block, then a `---- 中文 ----` block.

  NOTES_SECTIONS = ["GitHub Releases", "Google Play", "App Store (iOS)", "Mac App Store"].freeze
  NOTES_SECTION_LINE = /^={4,}[ \t]*(.*?)[ \t]*=*[ \t]*$/
  NOTES_LANGUAGE_LINE = /^-{4,}[ \t]*(.*?)[ \t]*-*[ \t]*$/
  # The fallback draft marks what's left to write with this, and the release
  # lanes refuse notes that still have it.
  NOTES_TODO = "TODO(release-notes)"
  # Google Play's limit for each language's release notes.
  PLAY_NOTES_LIMIT = 500

  # { github:, play: { en:, zh: }, ios:, mac: } from a notes file's text.
  def self.parse_notes(text, file)
    fail!("#{file} still has #{NOTES_TODO} placeholders. Finish the notes and delete them first.") if text.include?(NOTES_TODO)

    sections = notes_sections(text, file)
    notes = {
      github: sections.fetch("GitHub Releases"),
      play: split_languages(sections.fetch("Google Play"), "Google Play"),
      ios: split_languages(sections.fetch("App Store (iOS)"), "App Store (iOS)"),
      mac: split_languages(sections.fetch("Mac App Store"), "Mac App Store"),
    }
    notes[:play].each do |lang, body|
      fail!("Google Play notes (#{lang}) are #{body.length} characters; the limit is #{PLAY_NOTES_LIMIT}") if body.length > PLAY_NOTES_LIMIT
    end
    notes
  end

  # { "GitHub Releases" => text, ... } from the `==== <name> ====` lines.
  def self.notes_sections(text, file)
    parts = text.split(NOTES_SECTION_LINE, -1)
    parts.shift # Anything before the first section line, such as a comment.
    sections = parts.each_slice(2).to_h { |name, body| [name, body.to_s.strip] }
    unknown = sections.keys - NOTES_SECTIONS
    missing = NOTES_SECTIONS - sections.keys
    if unknown.any? || missing.any? || parts.size != NOTES_SECTIONS.size * 2
      fail!("#{file} needs one `==== <name> ====` line for each of #{NOTES_SECTIONS.join(', ')}; found #{parts.each_slice(2).map(&:first).inspect}")
    end
    sections
  end

  # { en:, zh: } from a store section's `---- English ----` and `---- 中文 ----` blocks.
  def self.split_languages(section, name)
    parts = section.split(NOTES_LANGUAGE_LINE, -1)
    parts.shift
    blocks = parts.each_slice(2).to_h { |label, body| [label, body.to_s.strip] }
    zh = blocks.select { |label, _| label.start_with?("中文") }.values
    en = blocks.select { |label, _| label.start_with?("English") }.values
    if blocks.size != 2 || zh.size != 1 || en.size != 1 || zh.first.empty? || en.first.empty?
      fail!("#{name} notes need a `---- English ----` block and a `---- 中文 ----` block, found #{blocks.keys.inspect}")
    end
    { en: en.first, zh: zh.first }
  end

  # Commits users never see, left out of the fallback draft.
  INTERNAL_COMMIT = /\A(Bump|Release|Merge|Update dependency|chore|ci|build)\b|\bfastlane\b|\bskills?\b/i

  # The release-notes shape with the commit subjects since the last tag
  # (`tag`, nil for none), for a person to sort and translate.
  def self.fallback_notes(subjects, tag)
    commits = subjects.map(&:strip).reject { |line| line.empty? || line.match?(INTERNAL_COMMIT) }
    list = commits.empty? ? "- #{NOTES_TODO}" : commits.map { |line| "- #{line}" }.join("\n")
    short = commits.empty? ? "- #{NOTES_TODO}" : commits.map { |line| "- #{line.sub(/\s*\(#\d+\)\z/, '')}" }.join("\n")

    store = lambda do |zh_locale, en_locale|
      <<~STORE.strip
        ---- English (#{en_locale}) ----

        # Features

        - #{NOTES_TODO}: only this platform's changes, or "Fix minor issues." under # Fixes

        # Fixes

        - #{NOTES_TODO}

        ---- 中文（#{zh_locale}）----

        # 功能

        - #{NOTES_TODO}：只写这个平台的改动，没有就在 # 修复 下写"修复若干小问题。"

        # 修复

        - #{NOTES_TODO}
      STORE
    end

    <<~NOTES
      <!-- #{NOTES_TODO}: Claude Code didn't write these. Commits since #{tag || 'the first commit'}; keep what users see: -->
      <!--
      #{short}
      -->

      ==== GitHub Releases ====

      # 功能

      - #{NOTES_TODO}

      # 修复

      - #{NOTES_TODO}

      ---

      # Features

      #{list}

      # Fixes

      - #{NOTES_TODO}

      ==== Google Play ====

      #{store.call('zh-CN', 'en-US')}

      ==== App Store (iOS) ====

      #{store.call('zh-Hans', 'en-US')}

      ==== Mac App Store ====

      #{store.call('zh-Hans', 'en-US')}
    NOTES
  end

  # ---------------------------------------------------------------------------
  # Build records
  #
  # Each build lane writes build.json next to its output: the commit, version
  # and build number it built, and the SHA-256 of each file it made. The upload
  # lanes take only a build of this commit, with this version and build number,
  # from a clean tree, whose files haven't changed since; the release lanes
  # build only when there's no such build (or with rebuild:true).

  # The record of a build: `files` are full paths under `out_dir`.
  def self.build_record(platform:, version:, build:, commit:, dirty:, out_dir:, files:, extra: {})
    {
      platform: platform,
      version: version,
      build: build,
      commit: commit,
      dirty: dirty,
      files: files.sort.to_h { |file| [file.delete_prefix("#{out_dir}/"), Digest::SHA256.file(file).hexdigest] },
    }.merge(extra)
  end

  # Why a build can't be uploaded from this checkout, or nil. `record` is the
  # parsed build.json, nil when there's none.
  def self.build_record_problem(record, platform:, version:, build:, head:, out_dir:)
    return "no #{platform} build of v#{version} yet" unless record
    return "the #{platform} build is v#{record['version']} (#{record['build']}), not v#{version} (#{build})" unless record["version"] == version && record["build"] == build
    return "the #{platform} build is of #{record['commit'][0, 8]}, not HEAD #{head[0, 8]}" unless record["commit"] == head
    return "the #{platform} build was made from uncommitted changes" if record["dirty"]

    changed = record["files"].reject do |file, sha|
      full = File.join(out_dir, file)
      File.exist?(full) && Digest::SHA256.file(full).hexdigest == sha
    end
    return "#{changed.keys.join(', ')} changed or went missing since the #{platform} build" unless changed.empty?

    nil
  end

  # ---------------------------------------------------------------------------
  # Electron (Windows and Linux) release files

  ELECTRON_PLATFORMS = {
    "win" => %w[latest.yml],
    "linux" => %w[latest-linux.yml latest-linux-arm64.yml],
  }.freeze

  # The platforms a `platforms:` option names (all of them when it's nil).
  def self.electron_platforms(option)
    platforms = (option || ELECTRON_PLATFORMS.keys.join(",")).to_s.split(",").map(&:strip)
    unknown = platforms - ELECTRON_PLATFORMS.keys
    fail!("Unknown platforms: #{unknown.join(', ')} (win, linux)") unless unknown.empty?
    platforms
  end

  # The version an update file is for, the files it names (its installers:
  # `path:` and each `url:`) and the SHA-512 it gives for each `url:`.
  def self.electron_update_entries(text)
    urls = text.scan(/^\s*(?:-\s*)?(?:url|path):\s*['"]?([^'"\s]+)['"]?\s*$/).flatten.uniq
    hashes = text.scan(/^\s*(?:-\s*)?url:\s*['"]?([^'"\s]+)['"]?\s*\n\s*sha512:\s*['"]?([^'"\s]+)/).to_h
    { version: text[/^version:\s*['"]?([^'"\s]+)/, 1], files: urls, sha512: hashes }
  end

  # What's wrong with the release files in `dir` for these platforms and
  # version: every update file is for this version, and every installer it
  # names is there with that SHA-512, so a build from another commit, or a
  # half-copied folder, is refused before anything is signed.
  def self.electron_file_problems(dir, platforms, version)
    problems = []
    platforms.flat_map { |platform| ELECTRON_PLATFORMS[platform] }.each do |name|
      yml = File.join(dir, name)
      unless File.exist?(yml)
        problems << "#{name} is missing"
        next
      end
      entry = electron_update_entries(File.read(yml))
      problems << "#{name} is for version #{entry[:version].inspect}, not #{version}" unless entry[:version] == version
      entry[:files].each do |file|
        path = File.join(dir, file)
        unless File.exist?(path)
          problems << "#{name} names #{file}, which is missing"
          next
        end
        expected = entry[:sha512][file]
        problems << "#{file}'s SHA-512 doesn't match #{name}" if expected && Digest::SHA512.file(path).base64digest != expected
      end
    end
    # The .debs aren't in any update file: their names carry the version
    # (learnX-<target>-v<version>, electron/packageConfig.ts).
    Dir[File.join(dir, "*.{exe,AppImage,deb}")].each do |path|
      problems << "#{File.basename(path)} isn't version #{version}" unless File.basename(path).include?("-v#{version}.")
    end
    problems << "no .deb for Linux" if platforms.include?("linux") && Dir[File.join(dir, "*.deb")].empty?
    problems
  end

  # ---------------------------------------------------------------------------
  # GitHub

  # Whether GitHub has the release `gh release view <tag> --json isDraft --jq
  # .isDraft` asked about: :none, :draft or :published.
  def self.github_release_state(tag, succeeded, out, err)
    return out.strip == "true" ? :draft : :published if succeeded
    return :none if err.include?("release not found")

    fail!("Couldn't look up the #{tag} release on GitHub: #{err.strip}")
  end

  FAILED_CONCLUSIONS = %w[failure cancelled timed_out action_required].freeze

  # Why a commit's CI isn't green, or nil, from the check runs GitHub lists
  # for it (its latest run of each job).
  def self.ci_problem(runs, sha)
    return "no CI runs on #{sha[0, 8]}" if runs.empty?

    running = runs.reject { |run| run["status"] == "completed" }.map { |run| run["name"] }
    failed = runs.select { |run| FAILED_CONCLUSIONS.include?(run["conclusion"]) }.map { |run| run["name"] }
    return "failed on #{sha[0, 8]}: #{failed.uniq.join(', ')}" unless failed.empty?
    return "still running on #{sha[0, 8]}: #{running.uniq.join(', ')}" unless running.empty?

    nil
  end

  # Whether one run of the Electron workflow passed a real update on Windows
  # and Linux, from its jobs.
  def self.update_e2e_passed?(jobs)
    updates = jobs.select { |job| job["name"].start_with?("Update E2E") }
    updates.size >= 2 && updates.all? { |job| job["conclusion"] == "success" }
  end
end
