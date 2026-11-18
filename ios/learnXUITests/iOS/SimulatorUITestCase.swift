#if !targetEnvironment(macCatalyst)
import XCTest

/// The base of the UI tests that run on an iOS simulator (`scripts/e2e/e2e.sh ios`): launches the app in Chinese
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
    let username = try XCTUnwrap(env["E2E_USERNAME"], "E2E_USERNAME missing; run scripts/e2e/e2e.sh ios")
    let password = try XCTUnwrap(env["E2E_PASSWORD"], "E2E_PASSWORD missing; run scripts/e2e/e2e.sh ios")

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

    // The set-up page opens over Today after the first login (`useLaunchSheet`), and the system's "Save Password?"
    // alert can open before or after it, over either: dismiss whichever is on top until the tabs are uncovered. The
    // set-up page doesn't open after logging in again, so with no alert or set-up page it's given 5 s to open.
    let savePassword = app.buttons.matching(
      NSPredicate(format: "label IN %@ AND identifier != %@", ["Not Now", "现在不", "以后"], "setup-not-now")
    ).firstMatch
    let setUpLater = element(id: "setup-not-now")
    // By identifier or by icon, as `tab(_:)` finds them.
    let tabs = element(NSPredicate(format: "identifier IN %@", Self.tabSymbols.flatMap { [$0.key] + $0.value }))
    var setUpClosed = false
    var uncoveredSince: Date?
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      if savePassword.exists {
        savePassword.tap()
        uncoveredSince = nil
      } else if setUpLater.exists {
        if setUpLater.isHittable {
          setUpLater.tap()
          setUpClosed = true
        }
        uncoveredSince = nil
      } else if tabs.exists {
        let since = uncoveredSince ?? Date()
        uncoveredSince = since
        if setUpClosed || Date().timeIntervalSince(since) >= 5 {
          return
        }
      }
      // Polls, returning early when the alert opens.
      _ = savePassword.waitForExistence(timeout: 1)
    }
    XCTFail("the tabs didn't show after logging in")
  }

  /// Taps a tab in the tab bar or the sidebar, whichever shows it: an iPad has both, one of them hidden.
  func open(tab id: String) throws {
    try self.tab(id).tap()
  }

  /// Opens a `learnx://` link in the app as it runs. `XCUIApplication.open(_:)` would end the app and launch it again
  /// with the link, and the new launch logs in and catches up again, with whatever the link set.
  func open(link: String) throws {
    let launched = processID
    XCUIDevice.shared.system.open(try XCTUnwrap(URL(string: link)))
    XCTAssertEqual(processID, launched, "opening \(link) launched the app again")
  }

  /// The app's process id, from its description: `XCUIApplication` has no property for it.
  private var processID: String? {
    app.debugDescription.firstMatch(of: /pid: (\d+)/).map { String($0.1) }
  }

  /// The tab in the tab bar or the sidebar that's on screen. When the tabs mount after a login in the same run of the
  /// app (a new install, or after logging out), the tab bar buttons have no identifiers until the app is launched
  /// again: SwiftUI's `TabView` in react-native-bottom-tabs doesn't pass on the `Tab`'s `accessibilityIdentifier`. So a
  /// tab is also found by its icon's filled SF Symbol, as the flows do (`.maestro/subflows/tab.yaml`).
  func tab(_ id: String) throws -> XCUIElement {
    let ids = [id] + (Self.tabSymbols[id] ?? [])
    let matches = app.descendants(matching: .any).matching(NSPredicate(format: "identifier IN %@", ids))
    try wait(matches.firstMatch, "tab \(id)", 10)
    return try XCTUnwrap(matches.allElementsBoundByIndex.first { $0.isHittable }, "tab \(id) isn't on screen")
  }

  /// The tabs' icons (`navigation/MainTab.tsx`, `helpers/systemIcons.ts`); Today's follows the time of day.
  private static let tabSymbols = [
    "tab-today": ["sunrise.fill", "sun.max.fill", "sunset.fill", "moon.stars.fill"],
    "tab-notices": ["bell.fill"],
    "tab-assignments": ["list.bullet.clipboard.fill"],
    "tab-files": ["folder.fill"],
    "tab-courses": ["books.vertical.fill"],
    "tab-settings": ["gearshape.fill"],
  ]

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
    if let value = shot.value {
      // Kept to look at what the pixel checks saw.
      let attachment = XCTAttachment(screenshot: value)
      attachment.lifetime = .keepAlways
      add(attachment)
    }
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
