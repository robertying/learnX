#if targetEnvironment(macCatalyst)
import UIKit
import XCTest

/// The Mac App Store screenshots: the same screens as the iPad shots (`.maestro/store/ipad.yaml`), each saved as a
/// window screenshot attachment named `NN-<slug>`. `scripts/store-screenshots.sh mac` runs it and exports the
/// attachments; `scripts/e2e-mac.sh` leaves it out otherwise. The Mac has no swipe actions, so a card's actions show
/// as its context menu.
@MainActor
final class StoreScreenshots: LearnXUITestCase {
  func testTakesStoreScreenshots() throws {
    // Every shot in one test: more than the 3 minutes scripts/e2e-mac.sh allows each test.
    executionTimeAllowance = 600
    try clearSettingsBadge()

    // 1 Notices with a notice open
    try open(tab: "tab-notices")
    try open(card: "notice-card", "MOCK_STORE_NOTICE", detail: "notice-detail")
    try waitFor(text: "MOCK_STORE_NOTICE_BODY", timeout: 15)
    try shot("01-notices")

    // 2 Another notice's actions
    try waitFor(card: "notice-card", "MOCK_NOTICE").rightClick()
    XCTAssertTrue(app.menuItems.firstMatch.waitForExistence(timeout: 5), "no card actions")
    try shot("02-notices-actions")
    app.typeKey(.escape, modifierFlags: [])

    // 3 All assignments with one open
    try open(tab: "tab-assignments")
    try filter("T_all")
    try open(card: "assignment-card", "MOCK_STORE_ASSIGNMENT", detail: "assignment-detail")
    try shot("03-assignments")

    // 4 Submitting it
    try waitFor(label: "T_submit").click()
    try waitFor(id: "assignmentSubmission")
    try shot("04-submission")

    // 5 Files with a PDF open
    try open(tab: "tab-files")
    try open(card: "file-card", "MOCK_STORE_FILE", detail: "file-detail")
    waitForAbsence(id: "file-loading", timeout: 60)
    try shot("05-files")

    // 6 Courses with one open and another's actions
    try open(tab: "tab-courses")
    try open(card: "course-card", "MOCK_STORE_COURSE", detail: "course-detail")
    try waitFor(card: "course-card", "MOCK_COURSE").rightClick()
    XCTAssertTrue(app.menuItems.firstMatch.waitForExistence(timeout: 5), "no card actions")
    try shot("06-courses")
    app.typeKey(.escape, modifierFlags: [])

    // 7 Search
    try open(tab: "tab-notices")
    let field = app.searchFields.firstMatch
    if !field.waitForExistence(timeout: 2) {
      try waitFor(label: "T_search").click()
    }
    XCTAssertTrue(field.waitForExistence(timeout: 5), "no search field")
    field.click()
    // Pasted: typing CJK goes through the input method.
    UIPasteboard.general.string = value("STORE_SEARCH_TERM")
    field.typeKey("v", modifierFlags: .command)
    UIPasteboard.general.string = ""
    try waitFor(card: "assignment-card", "MOCK_STORE_ASSIGNMENT")
    try shot("07-search")
    app.typeKey(.escape, modifierFlags: [])

    // 8 Settings with the calendar page open
    try openSetting("settings-calendar", page: "calendar-settings")
    try shot("08-calendar")
  }

  /// Opening Course Information Sharing once marks it seen, which hides the Settings badge.
  private func clearSettingsBadge() throws {
    try openSetting("settings-course-sharing", page: "course-information-sharing")
  }

  /// Saves the app's window, once it has settled, as an attachment kept even when the test passes.
  private func shot(_ name: String) throws {
    // Scroll bars fade and transitions end.
    Thread.sleep(forTimeInterval: 2)
    let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
#endif
