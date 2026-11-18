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

  /// The sidebar opens as it was left (`sidebarAutosaveName` in patches/react-native-screens@4.30.1.patch): UIKit only
  /// keeps it with the window's saved state, which quitting discards unless "Close windows when quitting an
  /// application" is off.
  func testSidebarStaysAsItWasLeft() throws {
    let tab = try waitFor(id: "tab-notices")
    // View › Hide Sidebar.
    app.typeKey("s", modifierFlags: [.command, .control])
    let hidden = expectation(for: NSPredicate(format: "isHittable == false"), evaluatedWith: tab)
    wait(for: [hidden], timeout: 5)

    try launch()
    try waitFor(id: "today", timeout: 60)
    XCTAssertFalse(element(id: "tab-notices").isHittable, "the sidebar came back after a relaunch")

    // Show it again for the tests after this one, and check that sticks too.
    app.typeKey("s", modifierFlags: [.command, .control])
    try launch()
    try logIn()
    XCTAssertTrue(try waitFor(id: "tab-notices").isHittable, "the sidebar stayed hidden after showing it")
  }

  /// The window opens at the size it was left at (`WindowFrameAutosave` in modules/windows), also when the window's
  /// saved state is thrown away, as quitting does by default (`ApplePersistenceIgnoreState` stands in for that).
  /// XCUITest can't resize a Catalyst window by dragging it, so a launch argument stands in for a saved size, and the
  /// next launch without it checks that the window saved the size it opened at.
  func testWindowKeepsItsSize() throws {
    try waitFor(id: "tab-notices")
    let original = app.windows.firstMatch.frame

    try launch(["ApplePersistenceIgnoreState": "YES", WindowFrame.key: WindowFrame.string(WindowFrame.smaller)])
    try waitFor(id: "today", timeout: 60)
    let restored = app.windows.firstMatch.frame
    XCTAssertEqual(restored.width, WindowFrame.smaller.width, accuracy: 2, "the window didn't open at the saved width")
    XCTAssertEqual(
      restored.height, WindowFrame.smaller.height, accuracy: 2, "the window didn't open at the saved height")

    try launch(["ApplePersistenceIgnoreState": "YES"])
    try waitFor(id: "today", timeout: 60)
    let reopened = app.windows.firstMatch.frame
    XCTAssertEqual(reopened.width, restored.width, accuracy: 2, "the window didn't keep its width")
    XCTAssertEqual(reopened.height, restored.height, accuracy: 2, "the window didn't keep its height")

    // Back to the frame the window had before, for the next runs.
    try launch(["ApplePersistenceIgnoreState": "YES", WindowFrame.key: WindowFrame.string(original)])
    try waitFor(id: "today", timeout: 60)
  }

  private enum WindowFrame {
    /// `WindowFrameAutosave.key`. Launch arguments override user defaults for that launch only.
    static let key = "Window Frame Main"
    static let smaller = CGRect(x: 200, y: 150, width: 860, height: 640)

    /// `NSStringFromCGRect`'s format, quoted so the argument reads as a string rather than a property list.
    static func string(_ frame: CGRect) -> String {
      "\"{{\(frame.minX), \(frame.minY)}, {\(frame.width), \(frame.height)}}\""
    }
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
