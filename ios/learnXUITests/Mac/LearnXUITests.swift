#if targetEnvironment(macCatalyst)
import XCTest

/// End-to-end tests for the Mac app, which Maestro can't drive. They follow the Maestro flows in `.maestro/`
/// (log in with the mock account, visit every tab, open items, favorite and archive, search, settings and logout)
/// and run with `scripts/e2e-mac.sh` (setup and steps: `LearnXUITestCase`).
@MainActor
final class LearnXUITests: LearnXUITestCase {
  // MARK: - Tests

  func testVisitsEveryTab() throws {
    try open(tab: "tab-today")
    try waitFor(containing: "即将截止")
    try open(tab: "tab-assignments")
    try waitFor(containing: "大作业1")
    try open(tab: "tab-files")
    try waitFor(containing: "深度学习框架")
    try open(tab: "tab-courses")
    try waitFor(containing: "量子与统计")
    try open(tab: "tab-settings")
    try waitFor(id: "settings-logout")
    try open(tab: "tab-notices")
    try waitFor(containing: "请按照助教的安排交作业")
  }

  func testOpensANoticeAnAssignmentAndAFile() throws {
    try open(tab: "tab-notices")
    try waitFor(containing: "请按照助教的安排交作业").click()
    try waitFor(id: "notice-detail")

    try open(tab: "tab-assignments")
    try waitFor(containing: "大作业1").click()
    try waitFor(id: "assignment-detail")
    try waitFor(containing: "附件1")

    try open(tab: "tab-files")
    try waitFor(containing: "深度学习框架").click()
    try waitFor(id: "file-detail")
  }

  func testFavoritesAndArchivesANotice() throws {
    let notice = "请按照助教的安排交作业"
    try open(tab: "tab-notices")

    try cardAction(on: notice, "收藏")
    try filter("收藏")
    try waitFor(containing: notice)

    try cardAction(on: notice, "取消收藏")
    try waitForAbsence(containing: notice)

    try filter("全部")
    try cardAction(on: notice, "归档")
    try waitForAbsence(containing: notice)
    try filter("已归档")
    try waitFor(containing: notice)

    try cardAction(on: notice, "取消归档")
    try filter("全部")
    try waitFor(containing: notice)
  }

  func testSearchesAndOpensAResult() throws {
    try open(tab: "tab-notices")
    let field = app.searchFields.firstMatch
    if !field.waitForExistence(timeout: 2) {
      try waitFor(label: "搜索").click()
    }
    XCTAssertTrue(field.waitForExistence(timeout: 5), "no search field")
    field.click()
    // ASCII only, as in the Maestro flow.
    field.typeText("AutoCAD")
    try waitFor(containing: "AutoCAD绘图基础练习").click()
    try waitFor(id: "assignment-detail")
  }

  /// patches/react-native-screens@4.30.1.patch: in a split view each column keeps its bar, as on iPad, instead of
  /// every bar competing for the window's toolbar.
  func testEachColumnHasItsOwnBar() throws {
    try open(tab: "tab-notices")
    try waitFor(containing: "请按照助教的安排交作业").click()
    let detail = try waitFor(id: "notice-detail")

    let bars = app.navigationBars.allElementsBoundByIndex.filter { !$0.frame.isEmpty }
    XCTAssertGreaterThanOrEqual(bars.count, 2, "the columns share one bar")
    // The list's filter stays over the list, left of the notice.
    let filter = try waitFor(label: "筛选")
    XCTAssertLessThanOrEqual(filter.frame.maxX, detail.frame.minX, "the list's filter isn't over the list")
  }

  /// patches/react-native-screens@4.30.1.patch: the toolbar search field's clear button empties the field without
  /// telling the search bar's delegate, so the results stayed filtered.
  func testClearingTheSearchShowsEverythingAgain() throws {
    try open(tab: "tab-notices")
    let field = app.searchFields.firstMatch
    if !field.waitForExistence(timeout: 2) {
      try waitFor(label: "搜索").click()
    }
    XCTAssertTrue(field.waitForExistence(timeout: 5), "no search field")
    field.click()
    field.typeText("AutoCAD")
    try waitFor(containing: "AutoCAD绘图基础练习")

    let clear = field.buttons.firstMatch
    XCTAssertTrue(clear.waitForExistence(timeout: 5), "no clear button in the search field")
    clear.click()
    try waitForAbsence(containing: "AutoCAD绘图基础练习")
  }

  /// patches/react-native-bottom-tabs@1.5.0.patch: logging out unmounts the tabs, and their toolbar tab bar stayed
  /// behind and blocked the next one, so tabs didn't switch after logging in again.
  func testTabsWorkAfterLoggingOutAndIn() throws {
    try logOut()
    try logIn()
    try open(tab: "tab-assignments")
    try waitFor(containing: "大作业1")
    try open(tab: "tab-files")
    try waitFor(containing: "深度学习框架")
    try open(tab: "tab-notices")
    try waitFor(containing: "请按照助教的安排交作业")
  }

  func testOpensSettingsPagesAndLogsOut() throws {
    try open(tab: "tab-settings")
    try waitFor(containing: "更新日志").click()
    try open(tab: "tab-settings")
    try waitFor(containing: "关于").click()
    try waitFor(matching: ".*© \\d+ Rui Ying.*")
    try logOut()
  }
}
#endif
