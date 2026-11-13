#if !targetEnvironment(macCatalyst)
import XCTest

/// Today on an iPhone. The header follows Today's list, which needs the list inside `FormScreen`'s view
/// (`components/Form.tsx`): mounted beside it, the header found no scroll view, so scrolling left the large title over
/// the rows. Following the list, the header collapses the large title as it scrolls and holds the pull-to-refresh
/// spinner above it.
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
    // opens in the bar, from a screenshot taken while the finger is still down.
    let held = holdingScreenshot(dragging: element(id: "today"), by: 300, after: 2.5)
    // The bar stretches with the pull and holds the spinner between its top row and the large title, which moves
    // down; before the pull that spot is the large title's row, empty in the middle.
    let gap = CGRect(x: bar.frame.midX - 40, y: bar.frame.minY + 44, width: 80, height: 80)
    XCTAssertGreaterThan(try XCTUnwrap(held).markedPixels(in: gap), 50, "no spinner in the gap above the list")
  }

  func testScrollingCollapsesTheLargeTitle() throws {
    guard UIDevice.current.userInterfaceIdiom == .phone else {
      throw XCTSkip("Today's list is the same on an iPad; the iPhone is enough")
    }
    try open(tab: "tab-today")
    try waitFor(id: "today-schedule", timeout: 30)
    let bar = try waitFor(idMatching: "今天")

    // Scrolled, the title is the bar's small one, centered at its top, where the expanded bar has nothing. Today's
    // mock day fits on the screen and would bounce back, so look while the finger holds it up.
    let top = CGRect(x: bar.frame.midX - 40, y: bar.frame.minY, width: 80, height: 44)
    XCTAssertEqual(XCUIScreen.main.screenshot().markedPixels(in: top), 0, "the bar's top isn't empty before scrolling")
    let held = try XCTUnwrap(holdingScreenshot(dragging: element(id: "today"), by: -200, after: 1.5))
    XCTAssertGreaterThan(held.markedPixels(in: top), 50, "the large title didn't collapse into the bar")
  }
}
#endif
