#if !targetEnvironment(macCatalyst)
import XCTest

/// The base of the UI tests that run on an iOS simulator (`scripts/e2e.sh ios`): launches the app in Chinese
/// (`-AppleLanguages`, as the Mac tests do) with no emulated server delay, logs in with the mock account the script
/// passes from `.env` unless the app is logged in already, and has the steps and queries the tests share.
@MainActor
class SimulatorUITestCase: XCTestCase {
  var app: XCUIApplication!

  /// The emulated server's delay (`services/launchOptions.ts`): none, normal or slow.
  var mockLatency: String { "none" }

  override func setUp() async throws {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launchArguments += ["-AppleLanguages", "(zh-Hans)", "-AppleLocale", "zh_CN", "-mockLatency", mockLatency]
    app.launch()
    try logIn()
  }

  override func tearDown() async throws {
    app.terminate()
  }

  // MARK: - Steps

  func logIn() throws {
    let started = element(idMatching: "welcome-continue|login-username|tab-.*")
    XCTAssertTrue(started.waitForExistence(timeout: 60), "the app didn't start")
    if !element(idMatching: "welcome-continue|login-username").exists {
      return
    }
    let env = ProcessInfo.processInfo.environment
    let username = try XCTUnwrap(env["E2E_USERNAME"], "E2E_USERNAME missing; run scripts/e2e.sh ios")
    let password = try XCTUnwrap(env["E2E_PASSWORD"], "E2E_PASSWORD missing; run scripts/e2e.sh ios")

    let welcome = element(id: "welcome-continue")
    if welcome.exists {
      welcome.tap()
    }
    let usernameField = try waitFor(id: "login-username")
    usernameField.tap()
    usernameField.typeText(username)
    let passwordField = try waitFor(id: "login-password")
    passwordField.tap()
    passwordField.typeText(password + "\n")

    // The set-up page opens over Today after the first login, maybe after the system's "Save Password?" alert.
    let next = element(idMatching: "setup-not-now|tab-.*")
    let deadline = Date().addingTimeInterval(30)
    while !next.exists, Date() < deadline {
      let notNow = app.buttons.matching(NSPredicate(format: "label IN %@", ["Not Now", "现在不", "以后"])).firstMatch
      if notNow.exists {
        notNow.tap()
      }
      _ = next.waitForExistence(timeout: 1)
    }
    let setUpLater = element(id: "setup-not-now")
    if setUpLater.waitForExistence(timeout: 5) {
      setUpLater.tap()
    }
  }

  /// Taps a tab in the tab bar or the sidebar, whichever shows it: an iPad has both, one of them hidden.
  func open(tab id: String) throws {
    try waitFor(id: id)
    let tab = app.descendants(matching: .any).matching(identifier: id).allElementsBoundByIndex.first { $0.isHittable }
    try XCTUnwrap(tab, "tab \(id) isn't on screen").tap()
  }

  /// Drags `element` down by `distance` points (up when negative) and holds it there, and returns a screenshot taken
  /// `delay` seconds in, while the finger is still down. XCUITest's press blocks until it lifts, so the screenshot is
  /// taken off the main thread.
  func holdingScreenshot(dragging element: XCUIElement, by distance: CGFloat, after delay: TimeInterval)
    -> XCUIScreenshot?
  {
    let shot = Screenshot()
    let taken = expectation(description: "screenshot")
    DispatchQueue.global().asyncAfter(deadline: .now() + delay) {
      shot.value = XCUIScreen.main.screenshot()
      taken.fulfill()
    }
    let start = element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: distance < 0 ? 0.6 : 0.3))
    start.press(
      forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: 0, dy: distance)), withVelocity: .slow,
      thenHoldForDuration: delay + 2)
    wait(for: [taken], timeout: 5)
    return shot.value
  }

  private final class Screenshot: @unchecked Sendable {
    var value: XCUIScreenshot?
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
  func waitFor(containing text: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(
      element(NSPredicate(format: "label CONTAINS %@ OR value CONTAINS %@", text, text)), "text \(text)", timeout)
  }

  func wait(_ element: XCUIElement, _ what: String, _ timeout: TimeInterval) throws -> XCUIElement {
    XCTAssertTrue(element.waitForExistence(timeout: timeout), "\(what) didn't show up")
    return element
  }
}
#endif
