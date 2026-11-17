#if targetEnvironment(macCatalyst)
import XCTest

/// `.maestro/07-screens.yaml`: the screens the other tests don't reach (the timetable, an assignment's submission
/// page, a course's courseX page, every Settings page and What's New), each checked by its id.
@MainActor
final class ScreensUITests: LearnXUITestCase {
  func testOpensTheSchedule() throws {
    try open(tab: "tab-today")
    try waitFor(id: "today-schedule").click()
    try waitFor(id: "schedule")
  }

  /// Pushed beside the assignment on the Mac (a sheet on iOS), and left without sending (the assignment takes online
  /// submissions).
  func testOpensTheSubmissionSheet() throws {
    try open(tab: "tab-assignments")
    try open(card: "assignment-card", "MOCK_ASSIGNMENT", detail: "assignment-detail")
    try waitFor(label: "T_submit").click()
    try waitFor(id: "assignmentSubmission")
    try waitFor(id: "pickAttachment")
    try back()
    waitForAbsence(id: "assignmentSubmission")
  }

  /// Pushed beside the course on the Mac (a sheet on iOS). A mock course isn't on courseX, so the page says Not Found.
  func testOpensACoursesInformation() throws {
    try open(tab: "tab-courses")
    try open(card: "course-card", "MOCK_COURSE", detail: "course-detail")
    try waitFor(label: "T_courseInformation").click()
    try waitFor(id: "courseXReload")
    try back()
    waitForAbsence(id: "courseXReload")
  }

  /// Every Settings page apart from Changelog and About (`SettingsUITests`). Swipe actions are set on iOS and
  /// Android, not on the Mac.
  func testOpensEverySettingsPage() throws {
    for (row, page) in [
      ("settings-semester", "semester-selection"),
      ("settings-notifications", "notification-settings"),
      ("settings-calendar", "calendar-settings"),
      ("settings-downloads", "downloads"),
      ("settings-course-sharing", "course-information-sharing"),
      ("settings-maintainer", "maintainer"),
      ("settings-help", "help"),
    ] {
      try openSetting(row, page: page)
    }
    XCTAssertFalse(element(id: "settings-swipe-actions").exists, "Swipe Actions shows on the Mac")

    // What's New opens as a sheet over Settings; Continue closes it.
    try waitFor(id: "settings-whats-new").click()
    try waitFor(id: "whats-new")
    try waitFor(id: "whats-new-continue").click()
    waitForAbsence(id: "whats-new")
  }
}
#endif
