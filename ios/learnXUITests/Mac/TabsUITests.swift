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

  /// The sidebar opens as it was left (`sidebarHidden` in `data/appState.ts`): UIKit only keeps it with the window's
  /// saved state, which quitting discards unless "Close windows when quitting an application" is off.
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
  func testWindowKeepsItsSize() throws {
    try waitFor(id: "tab-notices")
    let original = app.windows.firstMatch.frame
    try resizeWindow(by: CGVector(dx: -120, dy: -80))
    let resized = app.windows.firstMatch.frame
    XCTAssertNotEqual(resized.size, original.size, "the window didn't resize")

    try launch(["ApplePersistenceIgnoreState": "YES"])
    try waitFor(id: "today", timeout: 60)
    let reopened = app.windows.firstMatch.frame
    XCTAssertEqual(reopened.width, resized.width, accuracy: 2, "the window didn't keep its width")
    XCTAssertEqual(reopened.height, resized.height, accuracy: 2, "the window didn't keep its height")

    // Back to the size the tests after this one expect.
    try resizeWindow(by: CGVector(dx: 120, dy: 80))
  }

  /// Drags the window's bottom right corner by `offset`.
  private func resizeWindow(by offset: CGVector) throws {
    let window = app.windows.firstMatch
    let corner = window.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 1)).withOffset(CGVector(dx: -2, dy: -2))
    corner.press(forDuration: 0.3, thenDragTo: corner.withOffset(offset))
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
