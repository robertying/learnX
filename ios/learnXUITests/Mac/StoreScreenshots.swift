#if targetEnvironment(macCatalyst)
import UIKit
import XCTest

/// The Mac App Store screenshots: the same screens as the iPad shots (`.maestro/store/ipad.yaml`), each saved as a
/// window screenshot attachment named `NN-<slug>`. `scripts/e2e/store-screenshots.sh mac` runs it and exports the
/// attachments; `scripts/e2e/e2e-mac.sh` leaves it out otherwise. The Mac has no swipe actions, so a card's actions show
/// as its context menu.
@MainActor
final class StoreScreenshots: LearnXUITestCase {
  /// The clock scripts/e2e/store-screenshots.sh pins, so Today shows the same classes every time.
  override var launchOptions: [String: String] {
    let clock = ProcessInfo.processInfo.environment["E2E_CLOCK"] ?? ""
    return clock.isEmpty ? [:] : ["mockClock": clock]
  }

  /// Beijing's time zone, so Today shows class times without a Beijing time note.
  override var launchEnvironment: [String: String] { ["TZ": "Asia/Shanghai"] }

  func testTakesStoreScreenshots() throws {
    // Every shot in one test: more than the 3 minutes scripts/e2e/e2e-mac.sh allows each test.
    executionTimeAllowance = 600
    try clearSettingsBadge()

    // 1 Today with the schedule open beside it
    try open(tab: "tab-today")
    try waitFor(text: "MOCK_ASSIGNMENT", timeout: 15)
    try waitFor(id: "today-schedule").click()
    try waitFor(id: "schedule")
    try shot("01-today")

    // 2 Notices with a notice open and another notice's actions
    try open(tab: "tab-notices")
    try open(card: "notice-card", "MOCK_STORE_NOTICE", detail: "notice-detail")
    try waitFor(text: "MOCK_STORE_NOTICE_BODY", timeout: 15)
    try waitFor(card: "notice-card", "MOCK_STORE_SWIPE_NOTICE").rightClick()
    XCTAssertTrue(app.menuItems.firstMatch.waitForExistence(timeout: 5), "no card actions")
    try shot("02-notices")
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
    try waitFor(card: "notice-card", "MOCK_NOTICE")
    try shot("07-search")
    app.typeKey(.escape, modifierFlags: [])

    // 8 Settings with the notifications page open
    try openSetting("settings-notifications", page: "notification-settings")
    for row in ["notifications-notices", "notifications-assignments", "notifications-files"] {
      try toggle(row, on: true)
    }
    try shot("08-notifications")

    // 9 Settings with the calendar page open. Its syncs stay off: on the Mac they'd write into the user's own
    // calendars.
    try openSetting("settings-calendar", page: "calendar-settings")
    try shot("09-calendar")
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
