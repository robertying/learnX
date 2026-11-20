import XCTest

/// What the performance tests (`PerfUITests` for iOS and for the Mac) share. They measure only when the runner has
/// `E2E_PERF=1` (`TEST_RUNNER_E2E_PERF=1` to xcodebuild), so the E2E runs skip them; the performance scripts set it,
/// with `E2E_PERF_SCALE` (the mock account's `mockScale`, `normal` unless set) and `E2E_PERF_RUNS` (iterations, 7
/// unless set: the scripts drop the first, which starts from whatever the app last had).
enum PerfRun {
  private static var environment: [String: String] { ProcessInfo.processInfo.environment }

  static func skipUnlessAsked() throws {
    if environment["E2E_PERF"] != "1" {
      throw XCTSkip("A performance run: set TEST_RUNNER_E2E_PERF=1")
    }
  }

  /// The launch arguments of every launch: the mock account's scale.
  static var launchOptions: [String: String] { ["mockScale": environment["E2E_PERF_SCALE"] ?? "normal"] }

  static var options: XCTMeasureOptions {
    let options = XCTMeasureOptions()
    options.iterationCount = Int(environment["E2E_PERF_RUNS"] ?? "") ?? 7
    return options
  }

  /// The lists each tab opens on, by tab and the cards it shows.
  static let tabs = [
    ("tab-notices", "notice-card"), ("tab-assignments", "assignment-card"), ("tab-files", "file-card"),
    ("tab-courses", "course-card"),
  ]

  /// Gives the setup's launch time to fetch the semester at the asked scale and save it, so every measured launch
  /// starts from that cache, as a real one does.
  static let settle: TimeInterval = 5
}
