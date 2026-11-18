#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/08-settings.yaml` and `.maestro/13-settings-logout.yaml`: change settings and put each back, open
/// Changelog and About, and log out.
///
/// The notification and calendar settings are left out on the Mac: their first switch asks for the permission in the
/// system's own prompt, and the calendar and Reminders syncs would write to the Mac's real calendars.
@MainActor
final class SettingsUITests: LearnXUITestCase {
  func testChangesSettingsAndPutsThemBack() throws {
    try open(tab: "tab-settings")
    try toggle("settings-graduate", on: true)
    try toggle("settings-graduate", on: false)

    // Semester: another one, then the one it showed again.
    try openSetting("settings-semester", page: "semester-selection")
    let semesters = app.descendants(matching: .any)
      .matching(NSPredicate(format: "identifier MATCHES %@", "semester-\\d.*"))
    XCTAssertTrue(semesters.firstMatch.waitForExistence(timeout: 10), "no semesters")
    let chosen = try XCTUnwrap(
      semesters.allElementsBoundByIndex.first { $0.isSelected }, "no semester chosen\n\(app.debugDescription)")
    let chosenId = chosen.identifier
    let other = try XCTUnwrap(semesters.allElementsBoundByIndex.first { !$0.isSelected }, "only one semester")
    let otherId = other.identifier
    other.click()
    try waitFor(selected: otherId)
    element(id: chosenId).click()
    try waitFor(selected: chosenId)

    // Course information sharing: on and off (a mock account never uploads).
    try openSetting("settings-course-sharing", page: "course-information-sharing")
    try toggle("course-sharing-toggle", on: true, confirm: "T_join")
    try toggle("course-sharing-toggle", on: false)
  }

  func testOpensSettingsPagesAndLogsOut() throws {
    try open(tab: "tab-settings")
    try waitFor(id: "settings-changelog").click()
    if !element(id: "settings-about").waitForExistence(timeout: 2) {
      try fillTheScreen()
    }
    try waitFor(id: "settings-about").click()
    try waitFor(matching: ".*© \\d+ Rui Ying.*")
    try logOut()
  }

  /// Window › Move & Resize › Fill. In a short window (a new window's default size) the last Settings rows are below
  /// the fold, where the list leaves them out of the accessibility tree, and the tests' scrolling doesn't reach it.
  private func fillTheScreen() throws {
    try wait(app.menuBars.menuBarItems["com.apple.menu.window"], "the Window menu", 5).click()
    try wait(app.menuItems["移动与调整大小"], "Move & Resize", 5).hover()
    try wait(app.menuItems["_zoomFill:"], "Fill", 5).click()
  }

  private func waitFor(selected id: String) throws {
    let row = element(id: id)
    let selected = expectation(for: NSPredicate(format: "selected == true"), evaluatedWith: row)
    if XCTWaiter().wait(for: [selected], timeout: 5) != .completed {
      XCTFail("\(id) isn't chosen\n\(app.debugDescription)")
    }
  }
}
#endif
