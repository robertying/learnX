#if !targetEnvironment(macCatalyst)
import XCTest

/// Today on an iPhone. Pulling to refresh shows the spinner above the list, which `ListRefreshControl.swift` keeps
/// above the rows: the first section's background used to cover it, leaving an empty gap.
@MainActor
final class TodayUITests: SimulatorUITestCase {
  func testPullToRefreshShowsTheSpinner() throws {
    guard UIDevice.current.userInterfaceIdiom == .phone else {
      throw XCTSkip("Today's list is the same on an iPad; the iPhone is enough")
    }
    try open(tab: "tab-today")
    try waitFor(id: "today-schedule", timeout: 30)
    let bar = try waitFor(idMatching: "今天")
    XCTAssertEqual(bar.elementType, .navigationBar)

    // The spinner shows while the list is held down, and isn't in the accessibility tree: look at the gap the pull
    // opens below the bar, from a screenshot taken while the finger is still down.
    let held = holdingScreenshot(pullingDown: element(id: "today"), by: 300, after: 2.5)
    // The spinner sits just below the bar; the first section's header is further down.
    let gap = CGRect(x: bar.frame.midX - 40, y: bar.frame.maxY, width: 80, height: 80)
    XCTAssertGreaterThan(try XCTUnwrap(held).markedPixels(in: gap), 50, "no spinner in the gap above the list")
  }
}
#endif
