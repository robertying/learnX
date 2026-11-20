#if !targetEnvironment(macCatalyst)
import XCTest

/// Launch time, and the app's time, memory and CPU to its first list and through every tab, for the performance runs
/// (`PerfRun`): `TEST_RUNNER_E2E_PERF=1 scripts/e2e/e2e.sh ios --ui -only-testing:learnXUITests/PerfUITests`. Each
/// measured launch starts logged in with the semester cached, as most launches do. The app's own marks for the same
/// launches (`services/perf`) are in its user defaults, `perfLaunches`.
final class PerfUITests: SimulatorUITestCase {
  override var launchOptions: [String: String] { PerfRun.launchOptions }

  override func setUp() async throws {
    try PerfRun.skipUnlessAsked()
    try await super.setUp()
    try waitFor(id: "today", timeout: 30)
    _ = XCTWaiter().wait(for: [XCTestExpectation(description: "settle")], timeout: PerfRun.settle)
  }

  /// To the first frame the app draws (React Native's splash until the stores load).
  func testLaunch() {
    measure(metrics: [XCTApplicationLaunchMetric(waitUntilResponsive: true)], options: PerfRun.options) {
      app.launch()
    }
  }

  /// To Today with its content.
  func testLaunchToToday() {
    measure(
      metrics: [XCTClockMetric(), XCTMemoryMetric(application: app), XCTCPUMetric(application: app)],
      options: PerfRun.options
    ) {
      app.launch()
      XCTAssertTrue(element(id: "today").waitForExistence(timeout: 60), "Today didn't show")
    }
  }

  /// From launch through every list tab, each with its cards.
  func testTabs() {
    measure(
      metrics: [XCTClockMetric(), XCTMemoryMetric(application: app), XCTCPUMetric(application: app)],
      options: PerfRun.options
    ) {
      app.launch()
      XCTAssertTrue(element(id: "today").waitForExistence(timeout: 60), "Today didn't show")
      for (tab, card) in PerfRun.tabs {
        XCTAssertNoThrow(try open(tab: tab))
        XCTAssertTrue(
          app.descendants(matching: .any).matching(identifier: card).firstMatch.waitForExistence(timeout: 30),
          "\(tab) showed no \(card)")
      }
    }
  }
}
#endif
