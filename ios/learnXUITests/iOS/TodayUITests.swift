#if !targetEnvironment(macCatalyst)
import XCTest

/// Today on an iPhone. The header follows Today's list, which needs the list inside `FormScreen`'s view
/// (`components/Form.tsx`): mounted beside it, the header found no scroll view, so scrolling left the large title over
/// the rows. Following the list, the header collapses the large title as it scrolls and holds the pull-to-refresh
/// spinner above it. On the closed iPhone Duo the tab bar runs down the side and the header keeps the title in one row
/// that neither stretches nor collapses; the spinner shows at the top of the list, in the same spot.
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
    // The refresh lasts as long as its requests, so it has to outlast the screenshot below. The app launched with no
    // emulated delay, so its login and catch-up are over; from here on each request takes 3 to 6 s, and the refresh
    // makes requests of its own rather than joining ones under way.
    app.open(try XCTUnwrap(URL(string: "learnx://mock-network?latency=slow")))

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
    // The tabs are one above another in a tab bar down the side.
    if try abs(tab("tab-today").frame.midX - tab("tab-notices").frame.midX) < 1 {
      throw XCTSkip("Beside a tab bar down the side (the closed iPhone Duo), the title has no collapsed form")
    }
    let bar = try waitFor(idMatching: "今天")

    // Scrolled, the title is the bar's small one, in its top row before the buttons, where the expanded bar has
    // nothing. UIKit centers it when the title and subtitle fit between the bar's ends and puts it at the leading
    // edge when they don't, as with the week in the subtitle beside Search and Settings, so look along the whole row.
    // Today's mock day fits on the screen and would bounce back, so look while the finger holds it up.
    let buttons = bar.buttons.allElementsBoundByIndex.map(\.frame).filter { $0.minX > bar.frame.midX }
    let trailing = buttons.map(\.minX).min() ?? bar.frame.maxX
    let leading = bar.frame.minX + 16
    let top = CGRect(x: leading, y: bar.frame.minY, width: trailing - 8 - leading, height: 44)
    XCTAssertEqual(XCUIScreen.main.screenshot().markedPixels(in: top), 0, "the bar's top isn't empty before scrolling")
    let held = try XCTUnwrap(holdingScreenshot(dragging: element(id: "today"), by: -200, after: 1.5))
    XCTAssertGreaterThan(held.markedPixels(in: top), 50, "the large title didn't collapse into the bar")
  }
}
#endif
