#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/04-tabs.yaml`: every tab shows its content, and a course opens beside the courses.
@MainActor
final class TabsUITests: LearnXUITestCase {
  func testVisitsEveryTab() throws {
    try open(tab: "tab-notices")
    try waitFor(card: "notice-card", "MOCK_NOTICE")
    try open(tab: "tab-today")
    try waitFor(text: "T_todayDueSoon")
    try open(tab: "tab-assignments")
    try waitFor(card: "assignment-card", "MOCK_ASSIGNMENT")
    try open(tab: "tab-files")
    try waitFor(card: "file-card", "MOCK_FILE")
    try open(tab: "tab-courses")
    try open(card: "course-card", "MOCK_COURSE", detail: "course-detail")
    try open(tab: "tab-settings")
    try waitFor(id: "settings-logout")
    try open(tab: "tab-notices")
    try waitFor(card: "notice-card", "MOCK_NOTICE")
  }

  /// patches/react-native-bottom-tabs@1.5.0.patch: logging out unmounts the tabs, and their toolbar tab bar stayed
  /// behind and blocked the next one, so tabs didn't switch after logging in again.
  func testTabsWorkAfterLoggingOutAndIn() throws {
    try logOut()
    try logInAgain()
    try open(tab: "tab-assignments")
    try waitFor(card: "assignment-card", "MOCK_ASSIGNMENT")
    try open(tab: "tab-files")
    try waitFor(card: "file-card", "MOCK_FILE")
    try open(tab: "tab-notices")
    try waitFor(card: "notice-card", "MOCK_NOTICE")
  }

  /// patches/react-native-screens@4.30.1.patch: in a split view each column keeps its bar, as on iPad, instead of
  /// every bar competing for the window's toolbar.
  func testEachColumnHasItsOwnBar() throws {
    try open(tab: "tab-notices")
    try open(card: "notice-card", "MOCK_NOTICE", detail: "notice-detail")
    let detail = try waitFor(id: "notice-detail")

    let bars = app.navigationBars.allElementsBoundByIndex.filter { !$0.frame.isEmpty }
    XCTAssertGreaterThanOrEqual(bars.count, 2, "the columns share one bar")
    // The list's filter stays over the list, left of the notice.
    let filter = try waitFor(label: "T_filter")
    XCTAssertLessThanOrEqual(filter.frame.maxX, detail.frame.minX, "the list's filter isn't over the list")
  }
}
#endif
