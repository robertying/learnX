#if targetEnvironment(macCatalyst)
import XCTest

/// The base of the Mac app's UI tests (`LearnXUITests`, `StoreScreenshots`): launches the app in Chinese
/// (`-AppleLanguages`, so the mock data's titles are the same on every Mac), logs in with the mock account that
/// `scripts/e2e-mac.sh` passes from `.env`, and has the steps and queries they share. The tests move the real pointer
/// and type on the real keyboard, so the Mac can't be used while they run.
@MainActor
class LearnXUITestCase: XCTestCase {
  var app: XCUIApplication!

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

  // MARK: - Steps

  /// Logs out of whatever account the app has, then logs in with the mock account.
  func logIn() throws {
    let env = ProcessInfo.processInfo.environment
    let username = try XCTUnwrap(env["E2E_USERNAME"], "E2E_USERNAME missing; run scripts/e2e-mac.sh")
    let password = try XCTUnwrap(env["E2E_PASSWORD"], "E2E_PASSWORD missing; run scripts/e2e-mac.sh")

    let started = element(idMatching: "welcome-continue|login-username|tab-notices")
    XCTAssertTrue(started.waitForExistence(timeout: 60), "the app didn't start")
    if element(id: "tab-notices").exists {
      // An account an older version left logged in first gets What's New, which covers the sidebar.
      let whatsNew = element(id: "whats-new-continue")
      if whatsNew.waitForExistence(timeout: 3) {
        whatsNew.click()
      }
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

  func logOut() throws {
    try open(tab: "tab-settings")
    try waitFor(id: "settings-logout").click()
    // The alert is a sheet on the Mac, and its buttons have a title, not a label.
    let confirm = app.sheets.buttons.matching(NSPredicate(format: "title == %@", "退出登录")).firstMatch
    XCTAssertTrue(confirm.waitForExistence(timeout: 5), "no logout confirmation")
    confirm.click()
    // The welcome page when this account never saw it (one an older version logged in), else the login page.
    try waitFor(idMatching: "welcome-continue|login-username(-label)?", timeout: 15)
  }

  func open(tab id: String) throws {
    try waitFor(id: id).click()
  }

  /// Picks the list filter whose label starts with `label` (the menu item adds the count).
  func filter(_ label: String) throws {
    try waitFor(label: "筛选").click()
    let item = app.menuItems.matching(NSPredicate(format: "title BEGINSWITH %@ OR label BEGINSWITH %@", label, label))
      .firstMatch
    XCTAssertTrue(item.waitForExistence(timeout: 5), "no filter \(label)")
    item.click()
  }

  /// Runs a card's action from its context menu.
  func cardAction(on title: String, _ action: String) throws {
    try waitFor(containing: title).rightClick()
    let item = app.menuItems.matching(NSPredicate(format: "title == %@ OR label == %@", action, action)).firstMatch
    XCTAssertTrue(item.waitForExistence(timeout: 5), "no card action \(action)")
    item.click()
  }

  func type(_ text: String, into field: XCUIElement) {
    field.click()
    // A debug build may prefill the field.
    field.typeKey("a", modifierFlags: .command)
    field.typeKey(.delete, modifierFlags: [])
    field.typeText(text)
  }

  // MARK: - Queries

  func element(id: String) -> XCUIElement {
    app.descendants(matching: .any)[id]
  }

  func element(idMatching pattern: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "identifier MATCHES %@", pattern)).firstMatch
  }

  func element(_ predicate: NSPredicate) -> XCUIElement {
    app.descendants(matching: .any).matching(predicate).firstMatch
  }

  @discardableResult
  func waitFor(id: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(id: id), "id \(id)", timeout)
  }

  @discardableResult
  func waitFor(idMatching pattern: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(idMatching: pattern), "id \(pattern)", timeout)
  }

  @discardableResult
  func waitFor(label: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(NSPredicate(format: "label == %@", label)), "label \(label)", timeout)
  }

  @discardableResult
  func waitFor(containing text: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(
      element(NSPredicate(format: "label CONTAINS %@ OR value CONTAINS %@", text, text)), "text \(text)", timeout)
  }

  @discardableResult
  func waitFor(matching pattern: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(NSPredicate(format: "label MATCHES %@ OR value MATCHES %@", pattern, pattern)), pattern, timeout)
  }

  func waitForAbsence(containing text: String, timeout: TimeInterval = 10) throws {
    let match = element(NSPredicate(format: "label CONTAINS %@ OR value CONTAINS %@", text, text))
    let gone = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: match)
    wait(for: [gone], timeout: timeout)
  }

  func wait(_ element: XCUIElement, _ what: String, _ timeout: TimeInterval) throws -> XCUIElement {
    XCTAssertTrue(element.waitForExistence(timeout: timeout), "\(what) didn't show up")
    return element
  }
}
#endif
