import XCTest

#if targetEnvironment(macCatalyst)
typealias PerfUITestCase = LearnXUITestCase
#else
typealias PerfUITestCase = SimulatorUITestCase
#endif

/// Launch time, and the app's time, memory and CPU to its first list and through every tab, for the performance runs,
/// on iOS and the Mac: `TEST_RUNNER_E2E_PERF=1 scripts/e2e/e2e.sh ios --ui -only-testing:learnXUITests/PerfUITests`
/// or `TEST_RUNNER_E2E_PERF=1 scripts/e2e/e2e-mac.sh -only-testing:learnXUITests/PerfUITests`. They measure only when
/// the runner has `E2E_PERF=1`, so the E2E runs skip them. `E2E_PERF_SCALE` is the mock account's `mockScale` (`normal`
/// unless set) and `E2E_PERF_RUNS` the iterations (7 unless set: the scripts drop the first, which starts from whatever
/// the app last had). Each measured launch starts logged in with the semester cached, as most launches do. The app's
/// own marks for the same launches (`services/perf`) are in its user defaults, `perfLaunches`.
final class PerfUITests: PerfUITestCase {
  private static var environment: [String: String] { ProcessInfo.processInfo.environment }

  /// The lists each tab opens on, by tab and the cards it shows.
  private static let tabs = [
    ("tab-notices", "notice-card"), ("tab-assignments", "assignment-card"), ("tab-files", "file-card"),
    ("tab-courses", "course-card"),
  ]

  /// Gives the setup's launch time to fetch the semester at the asked scale and save it, so every measured launch
  /// starts from that cache, as a real one does.
  private static let settle = Duration.seconds(5)

  override var launchOptions: [String: String] { ["mockScale": Self.environment["E2E_PERF_SCALE"] ?? "normal"] }

  private var options: XCTMeasureOptions {
    let options = XCTMeasureOptions()
    options.iterationCount = Int(Self.environment["E2E_PERF_RUNS"] ?? "") ?? 7
    return options
  }

  override func setUp() async throws {
    if Self.environment["E2E_PERF"] != "1" {
      throw XCTSkip("A performance run: set TEST_RUNNER_E2E_PERF=1")
    }
    try await super.setUp()
    try waitFor(id: "today", timeout: 30)
    try await Task.sleep(for: Self.settle)
  }

  /// To the first frame the app draws (React Native's splash until the stores load).
  func testLaunch() {
    measure(metrics: [XCTApplicationLaunchMetric(waitUntilResponsive: true)], options: options) {
      app.launch()
    }
  }

  /// To Today with its content.
  func testLaunchToToday() {
    measure(
      metrics: [XCTClockMetric(), XCTMemoryMetric(application: app), XCTCPUMetric(application: app)],
      options: options
    ) {
      app.launch()
      XCTAssertTrue(element(id: "today").waitForExistence(timeout: 60), "Today didn't show")
    }
  }

  /// From launch through every list tab, each with its cards.
  func testTabs() {
    measure(
      metrics: [XCTClockMetric(), XCTMemoryMetric(application: app), XCTCPUMetric(application: app)],
      options: options
    ) {
      app.launch()
      XCTAssertTrue(element(id: "today").waitForExistence(timeout: 60), "Today didn't show")
      for (tab, card) in Self.tabs {
        do {
          try open(tab: tab)
        } catch {
          XCTFail("\(tab): \(error)")
        }
        XCTAssertTrue(
          app.descendants(matching: .any).matching(identifier: card).firstMatch.waitForExistence(timeout: 30),
          "\(tab) showed no \(card)")
      }
    }
  }
}
