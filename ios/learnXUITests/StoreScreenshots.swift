import UIKit
import XCTest

/// The Mac App Store screenshots: the same screens as the iPad shots (`.maestro/store/ipad.yaml`), each saved as a
/// window screenshot attachment named `NN-<slug>`. `scripts/store-screenshots.sh mac` runs it and exports the
/// attachments; `scripts/e2e-mac.sh` leaves it out otherwise. The Mac has no swipe actions, so a card's actions show
/// as its context menu.
@MainActor
final class StoreScreenshots: LearnXUITestCase {
  // Mock data (src/data/mock.ts) the shots open, as in scripts/e2e-env.mjs.
  private let notice = "第一次大作业"
  private let otherNotice = "请按照助教的安排交作业"
  private let assignment = "第一次大作业"
  private let file = "人类视觉系统"
  private let course = "视听信息系统导论"
  private let otherCourse = "量子与统计"
  private let noticeBody = "第一次大作业已布"
  private let searchTerm = "作业"

  func testTakesStoreScreenshots() throws {
    // Every shot in one test: more than the 3 minutes scripts/e2e-mac.sh allows each test.
    executionTimeAllowance = 600
    try clearSettingsBadge()

    // 1 Notices with a notice open
    try open(tab: "tab-notices")
    try waitFor(containing: notice).click()
    try waitFor(id: "notice-detail")
    try waitFor(containing: noticeBody, timeout: 15)
    try shot("01-notices")

    // 2 Another notice's actions
    try waitFor(containing: otherNotice).rightClick()
    XCTAssertTrue(app.menuItems.firstMatch.waitForExistence(timeout: 5), "no card actions")
    try shot("02-notices-actions")
    app.typeKey(.escape, modifierFlags: [])

    // 3 All assignments with one open
    try open(tab: "tab-assignments")
    try filter("全部")
    try waitFor(containing: assignment).click()
    try waitFor(id: "assignment-detail")
    try shot("03-assignments")

    // 4 Submitting it
    try waitFor(label: "提交").click()
    try waitFor(id: "assignmentSubmission")
    try shot("04-submission")

    // 5 Files with a PDF open
    try open(tab: "tab-files")
    try waitFor(containing: file).click()
    try waitFor(id: "file-detail")
    try waitForAbsence(id: "file-loading", timeout: 60)
    try shot("05-files")

    // 6 Courses with one open and another's actions
    try open(tab: "tab-courses")
    try waitFor(containing: course).click()
    try waitFor(id: "course-detail")
    try waitFor(containing: otherCourse).rightClick()
    XCTAssertTrue(app.menuItems.firstMatch.waitForExistence(timeout: 5), "no card actions")
    try shot("06-courses")
    app.typeKey(.escape, modifierFlags: [])

    // 7 Search
    try open(tab: "tab-notices")
    let field = app.searchFields.firstMatch
    if !field.waitForExistence(timeout: 2) {
      try waitFor(label: "搜索").click()
    }
    XCTAssertTrue(field.waitForExistence(timeout: 5), "no search field")
    field.click()
    // Pasted: typing CJK goes through the input method.
    UIPasteboard.general.string = searchTerm
    field.typeKey("v", modifierFlags: .command)
    UIPasteboard.general.string = ""
    try waitFor(containing: assignment)
    try shot("07-search")
    app.typeKey(.escape, modifierFlags: [])

    // 8 Settings with the calendar page open
    try open(tab: "tab-settings")
    try waitFor(containing: "日历与提醒事项").click()
    try waitFor(label: "日历与提醒事项", timeout: 5)
    try shot("08-calendar")
  }

  /// Opening Course Information Sharing once marks it seen, which hides the Settings badge.
  private func clearSettingsBadge() throws {
    try open(tab: "tab-settings")
    try waitFor(containing: "课程信息共享计划").click()
    try waitFor(label: "课程信息共享计划", timeout: 5)
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

  private func waitForAbsence(id: String, timeout: TimeInterval) throws {
    let gone = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: element(id: id))
    wait(for: [gone], timeout: timeout)
  }
}
