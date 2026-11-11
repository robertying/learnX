import XCTest

/// End-to-end tests for the Mac app, which Maestro can't drive. They follow the Maestro flows in `.maestro/`
/// (log in with the mock account, visit every tab, open items, favorite and archive, search, settings and logout)
/// and run with `scripts/e2e-mac.sh`, which passes the mock login from `.env`. They move the real pointer and type
/// on the real keyboard, so the Mac can't be used while they run.
///
/// The app runs in Chinese (`-AppleLanguages`), so the mock data's titles are the same on every Mac.
@MainActor
final class LearnXUITests: XCTestCase {
  private var app: XCUIApplication!

  override func setUp() async throws {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launchArguments += ["-AppleLanguages", "(zh-Hans)", "-AppleLocale", "zh_CN"]
    app.launch()
    try logIn()
  }

  override func tearDown() async throws {
    app.terminate()
  }

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

  func testOpensSettingsPagesAndLogsOut() throws {
    try open(tab: "tab-settings")
    try waitFor(containing: "更新日志").click()
    try open(tab: "tab-settings")
    try waitFor(containing: "关于").click()
    try waitFor(matching: ".*© \\d+ Rui Ying.*")
    try logOut()
  }

  // MARK: - Steps

  /// Logs out of whatever account the app has, then logs in with the mock account.
  private func logIn() throws {
    let env = ProcessInfo.processInfo.environment
    let username = try XCTUnwrap(env["E2E_USERNAME"], "E2E_USERNAME missing; run scripts/e2e-mac.sh")
    let password = try XCTUnwrap(env["E2E_PASSWORD"], "E2E_PASSWORD missing; run scripts/e2e-mac.sh")

    let started = element(idMatching: "welcome-continue|login-username|tab-notices")
    XCTAssertTrue(started.waitForExistence(timeout: 60), "the app didn't start")
    if element(id: "tab-notices").exists {
      try logOut()
    }
    let welcome = element(id: "welcome-continue")
    if welcome.exists {
      welcome.click()
    }

    try type(username, into: waitFor(id: "login-username"))
    try type(password + "\n", into: waitFor(id: "login-password"))

    // The set-up page opens over Today after the first login.
    let main = element(idMatching: "tab-notices|setup-not-now")
    XCTAssertTrue(main.waitForExistence(timeout: 30), "the login didn't finish")
    let notNow = element(id: "setup-not-now")
    if notNow.waitForExistence(timeout: 5) {
      notNow.click()
    }
    try waitFor(id: "tab-notices")
  }

  private func logOut() throws {
    try open(tab: "tab-settings")
    try waitFor(id: "settings-logout").click()
    // The alert's button repeats the row's label; it's the last one.
    let buttons = app.buttons.matching(NSPredicate(format: "label == %@", "退出登录"))
    let confirm = buttons.element(boundBy: max(buttons.count - 1, 0))
    XCTAssertTrue(confirm.waitForExistence(timeout: 5), "no logout confirmation")
    confirm.click()
    try waitFor(idMatching: "login-username(-label)?", timeout: 15)
  }

  private func open(tab id: String) throws {
    try waitFor(id: id).click()
  }

  /// Picks the list filter whose label starts with `label` (the menu item adds the count).
  private func filter(_ label: String) throws {
    try waitFor(label: "筛选").click()
    let item = app.menuItems.matching(NSPredicate(format: "title BEGINSWITH %@ OR label BEGINSWITH %@", label, label))
      .firstMatch
    XCTAssertTrue(item.waitForExistence(timeout: 5), "no filter \(label)")
    item.click()
  }

  /// Runs a card's action from its context menu.
  private func cardAction(on title: String, _ action: String) throws {
    try waitFor(containing: title).rightClick()
    let item = app.menuItems.matching(NSPredicate(format: "title == %@ OR label == %@", action, action)).firstMatch
    XCTAssertTrue(item.waitForExistence(timeout: 5), "no card action \(action)")
    item.click()
  }

  private func type(_ text: String, into field: XCUIElement) {
    field.click()
    // A debug build may prefill the field.
    field.typeKey("a", modifierFlags: .command)
    field.typeKey(.delete, modifierFlags: [])
    field.typeText(text)
  }

  // MARK: - Queries

  private func element(id: String) -> XCUIElement {
    app.descendants(matching: .any)[id]
  }

  private func element(idMatching pattern: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "identifier MATCHES %@", pattern)).firstMatch
  }

  private func element(_ predicate: NSPredicate) -> XCUIElement {
    app.descendants(matching: .any).matching(predicate).firstMatch
  }

  @discardableResult
  private func waitFor(id: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(id: id), "id \(id)", timeout)
  }

  @discardableResult
  private func waitFor(idMatching pattern: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(idMatching: pattern), "id \(pattern)", timeout)
  }

  @discardableResult
  private func waitFor(label: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(NSPredicate(format: "label == %@", label)), "label \(label)", timeout)
  }

  @discardableResult
  private func waitFor(containing text: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(
      element(NSPredicate(format: "label CONTAINS %@ OR value CONTAINS %@", text, text)), "text \(text)", timeout)
  }

  @discardableResult
  private func waitFor(matching pattern: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(NSPredicate(format: "label MATCHES %@ OR value MATCHES %@", pattern, pattern)), pattern, timeout)
  }

  private func waitForAbsence(containing text: String, timeout: TimeInterval = 10) throws {
    let match = element(NSPredicate(format: "label CONTAINS %@ OR value CONTAINS %@", text, text))
    let gone = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: match)
    wait(for: [gone], timeout: timeout)
  }

  private func wait(_ element: XCUIElement, _ what: String, _ timeout: TimeInterval) throws -> XCUIElement {
    XCTAssertTrue(element.waitForExistence(timeout: timeout), "\(what) didn't show up")
    return element
  }
}
