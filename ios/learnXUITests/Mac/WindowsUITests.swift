#if targetEnvironment(macCatalyst)
import XCTest

/// Several windows (`modules/windows`, `hooks/useWindow`): each window is a React root of its own on the one JS
/// runtime, and what reaches every root (menu commands, links, the semester sheet) acts only in the window it's for.
/// Maestro can't open a second window, so the iPad has no flow for this.
@MainActor
final class WindowsUITests: LearnXUITestCase {
  /// Leaves one window, as the other tests expect (`closeOtherWindows`).
  override func tearDown() async throws {
    if app != nil {
      closeOtherWindows()
    }
    try await super.tearDown()
  }

  func testOpensWindowsAndSendsCommandsToTheFrontOne() throws {
    try open(tab: "tab-notices")
    try open(card: "notice-card", "MOCK_NOTICE", detail: "notice-detail")

    // New Window opens on Today, beside the notice.
    try openNewWindow()
    try waitFor(windows: 2)
    let first = window(showing: "notice-detail")
    try waitForSidebars()

    // ⌘F opens Search in the front window only: the new one, then the first once it's clicked.
    try search(inFirst: false, first)
    try bringToFront(first)
    try search(inFirst: true, first)

    // A card's Open in New Window opens a third window on that item.
    first.descendants(matching: .any)["tab-assignments"].click()
    try wait(card("assignment-card", "MOCK_ASSIGNMENT"), "the assignment", 10).rightClick()
    try menuItem("T_openInNewWindow").click()
    try waitFor(windows: 3)
    _ = try wait(windows.containing(.any, identifier: "assignment-detail").firstMatch, "a window on the assignment", 30)
  }

  /// While an earlier semester is shown, Not Found (as for an item of the current semester) offers the semesters in a
  /// sheet. In the first window, which a second window opened after: a ref every window shared followed the last.
  func testOpensTheSemesterSheetInItsWindow() throws {
    try openSetting("settings-semester", page: "semester-selection")
    // The latest semester is listed first.
    let semesters = app.descendants(matching: .any)
      .matching(NSPredicate(format: "identifier MATCHES %@", "semester-\\d.*"))
    XCTAssertTrue(semesters.element(boundBy: 1).waitForExistence(timeout: 10), "fewer than two semesters")
    let latest = semesters.element(boundBy: 0).identifier
    let earlier = semesters.element(boundBy: 1).identifier
    element(id: earlier).click()
    try waitFor(selected: earlier, in: app)

    // Not Found in this window (a notice no semester has), then a second window, which mounts after it.
    try open(tab: "tab-notices")
    try openInWorkspace(XCTUnwrap(URL(string: "learnx://notice/no-such-notice")))
    try waitFor(id: "not-found", timeout: 15)
    try openNewWindow()
    try waitFor(windows: 2)
    let first = window(showing: "not-found")
    try waitForSidebars()

    try bringToFront(first)
    let switchSemester = first.buttons.matching(predicate("T_switchSemester", "==", ["label", "title"])).firstMatch
    try wait(switchSemester, "Switch Semester", 10).click()
    let sheet = first.sheets.firstMatch
    _ = try wait(sheet.descendants(matching: .any)["semester-selection"], "the semesters in the first window", 10)
    XCTAssertEqual(windowsWithSheets, 1, "the semesters opened in the other window too")

    // Puts the latest semester back, which closes the sheet: Not Found then offers nothing.
    sheet.descendants(matching: .any)[latest].click()
    waitForAbsence(switchSemester, "Switch Semester")
  }

  // MARK: - Windows

  private func waitFor(windows count: Int) throws {
    let opened = expectation(for: NSPredicate(format: "count == %d", count), evaluatedWith: windows)
    if XCTWaiter().wait(for: [opened], timeout: 15) != .completed {
      XCTFail("\(count) windows didn't open\n\(app.debugDescription)")
    }
  }

  /// The window that has the element `id` in it.
  private func window(showing id: String) -> XCUIElement {
    windows.containing(.any, identifier: id).firstMatch
  }

  /// How many windows show a sheet (Search, the semesters).
  private var windowsWithSheets: Int {
    windows.allElementsBoundByIndex.filter { $0.sheets.firstMatch.exists }.count
  }

  /// Waits for every window's sidebar: each window draws the app.
  private func waitForSidebars() throws {
    for window in windows.allElementsBoundByIndex {
      _ = try wait(window.descendants(matching: .any)["tab-notices"], "the sidebar in \(window)", 30)
    }
  }

  /// ⌘F shows Search in one window only, the first or the other one, then closes it.
  private func search(inFirst: Bool, _ first: XCUIElement) throws {
    app.typeKey("f", modifierFlags: .command)
    _ = try wait(app.sheets.searchFields.firstMatch, "Search", 10)
    XCTAssertEqual(windowsWithSheets, 1, "Search opened in more than one window")
    XCTAssertEqual(first.sheets.firstMatch.exists, inFirst, "Search opened in the wrong window")
    try close()
    waitForAbsence(app.sheets.firstMatch, "Search")
  }

  /// Brings `window` to the front with ⌘` (Cycle Through Windows), until its sidebar takes clicks, and clicks it
  /// (the window clicked in becomes the target). Clicking it directly could land on the window in front.
  private func bringToFront(_ window: XCUIElement) throws {
    let sidebar = window.descendants(matching: .any)["tab-notices"]
    let hittable = NSPredicate(format: "hittable == true")
    for _ in 0..<3 where !sidebar.isHittable {
      app.typeKey("`", modifierFlags: .command)
      _ = XCTWaiter().wait(for: [expectation(for: hittable, evaluatedWith: sidebar)], timeout: 3)
    }
    XCTAssertTrue(sidebar.isHittable, "\(window) didn't come to the front\n\(app.debugDescription)")
    sidebar.click()
  }

  /// File › New Window: UIKit's own item for an app with several windows, in the language the app runs in.
  private func openNewWindow() throws {
    try wait(app.menuBars.menuBarItems["com.apple.menu.file"], "the File menu", 5).click()
    let newWindow = app.menuItems.matching(NSPredicate(format: "title IN %@", ["New Window", "新建窗口"])).firstMatch
    try wait(newWindow, "New Window", 5).click()
  }

  private func waitFor(selected id: String, in parent: XCUIElement) throws {
    let row = parent.descendants(matching: .any)[id]
    let selected = expectation(for: NSPredicate(format: "selected == true"), evaluatedWith: row)
    if XCTWaiter().wait(for: [selected], timeout: 5) != .completed {
      XCTFail("\(id) isn't chosen\n\(app.debugDescription)")
    }
  }
}
#endif
