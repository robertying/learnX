#if targetEnvironment(macCatalyst)
import XCTest

/// The base of the Mac app's UI tests, which follow the Maestro flows in `.maestro/` (Maestro can't drive Mac
/// Catalyst) and run with `scripts/e2e/e2e-mac.sh`. It launches the app in Chinese (`-AppleLanguages`) with no emulated
/// server delay, logs in with the mock account the script passes from `.env`, and has the steps and queries the tests
/// share. The tests move the real pointer and type on the real keyboard, so the Mac can't be used while they run.
///
/// Labels and mock texts come from the same values the flows use (`scripts/e2e/e2e-env.mjs`, which the script passes to
/// the test runner): `value("T_favorite")` is the translation as `English|中文`, `value("MOCK_NOTICE")` the mock
/// notice's title in both languages. Name them as string literals: the script prints only the keys it finds.
@MainActor
class LearnXUITestCase: XCTestCase {
  var app: XCUIApplication!

  /// The first test of a run logs out of whatever account the app has (the learnX Mac app's data is shared with
  /// every other copy of it on the Mac); the tests after it keep the mock login, as the flows do.
  private static var loggedOutOnce = false

  /// Launch arguments of a test login or a failure to emulate (`services/launchOptions.ts`), as `-name value`.
  var launchOptions: [String: String] { [:] }

  override func setUp() async throws {
    continueAfterFailure = false
    try launch(launchOptions)
    try logIn()
  }

  override func tearDown() async throws {
    app?.terminate()
  }

  // MARK: - Steps

  /// (Re)launches the app with `options` as launch arguments, after the default of no emulated server delay.
  func launch(_ options: [String: String] = [:]) throws {
    app?.terminate()
    app = XCUIApplication()
    app.launchArguments += ["-AppleLanguages", "(zh-Hans)", "-AppleLocale", "zh_CN"]
    for (name, value) in ["mockLatency": "none"].merging(options, uniquingKeysWith: { $1 }) {
      app.launchArguments += ["-\(name)", value]
    }
    app.launch()
  }

  /// Waits for the app to start, logs out once per run (see `loggedOutOnce`), and logs in with the mock account
  /// unless it's logged in.
  func logIn() throws {
    let started = element(idMatching: "welcome-continue|login-username|tab-notices")
    XCTAssertTrue(started.waitForExistence(timeout: 60), "the app didn't start")
    closeOtherWindows()
    if element(id: "tab-notices").exists {
      // An account an older version left logged in first gets What's New, which covers the sidebar.
      let whatsNew = element(id: "whats-new-continue")
      if whatsNew.waitForExistence(timeout: 2) {
        whatsNew.click()
      }
      if Self.loggedOutOnce {
        return
      }
      try logOut()
    }
    Self.loggedOutOnce = true
    try logInAgain()
  }

  /// Logs in with the mock account from the welcome or login page.
  func logInAgain() throws {
    let env = ProcessInfo.processInfo.environment
    let username = try XCTUnwrap(env["E2E_USERNAME"], "E2E_USERNAME missing; run scripts/e2e/e2e-mac.sh")
    let password = try XCTUnwrap(env["E2E_PASSWORD"], "E2E_PASSWORD missing; run scripts/e2e/e2e-mac.sh")

    let welcome = element(id: "welcome-continue")
    if welcome.exists {
      welcome.click()
    }
    try type(username, into: waitFor(id: "login-username"))
    // Tab moves on to the password, as in any Mac sign-in form.
    app.typeKey(.tab, modifierFlags: [])
    let passwordField = try waitFor(id: "login-password")
    XCTAssertTrue(
      passwordField.value(forKey: "hasKeyboardFocus") as? Bool ?? false, "Tab didn't move to the password")
    passwordField.typeKey("a", modifierFlags: .command)
    passwordField.typeKey(.delete, modifierFlags: [])
    passwordField.typeText(password + "\n")

    // The set-up page opens over Today after the first login.
    try waitFor(idMatching: "tab-notices|setup-not-now", timeout: 30)
    let notNow = element(id: "setup-not-now")
    if notNow.waitForExistence(timeout: 5) {
      notNow.click()
    }
    try waitFor(id: "tab-notices")
  }

  /// Closes every window but one with its close button. A window left open (`WindowsUITests`, or a run stopped
  /// midway) comes back at the next launch, and its sidebar would match the tests' queries twice.
  func closeOtherWindows() {
    for _ in 0..<5 where windows.count > 1 {
      app.typeKey(.escape, modifierFlags: [])
      let close = windows.element(boundBy: 0).buttons["_XCUI:CloseWindow"]
      if !close.waitForExistence(timeout: 2) {
        return
      }
      close.click()
    }
  }

  func logOut() throws {
    try open(tab: "tab-settings")
    try waitFor(id: "settings-logout").click()
    // The alert's button is the Settings row's label without its ellipsis. The alert is a sheet on the Mac, and its
    // buttons have a title, not a label.
    try alertButton("T_logout").click()
    // The welcome page when this account never saw it (one an older version logged in), else the login page.
    try waitFor(idMatching: "welcome-continue|login-username(-label)?", timeout: 15)
  }

  func open(tab id: String) throws {
    try waitFor(id: id).click()
  }

  /// Opens a card in the current list, matched by its id and its text, and waits for the detail it opens.
  func open(card id: String, _ text: String, detail: String) throws {
    try waitFor(card: id, text).click()
    try waitFor(id: detail)
  }

  /// Picks the list filter (or, in Search, toggles the filter option) whose label starts with the value `name`:
  /// the menu item adds the count.
  func filter(_ name: String) throws {
    try waitFor(label: "T_filter").click()
    try menuItem(name).click()
  }

  /// Runs a card's action, from its context menu.
  func cardAction(_ id: String, _ text: String, _ action: String) throws {
    try waitFor(card: id, text).rightClick()
    try menuItem(action).click()
  }

  /// Opens Search (a sheet) from the current list's header and types `term` into its field.
  func search(_ term: String) throws {
    try waitFor(label: "T_search").click()
    let field = try searchField()
    field.click()
    field.typeText(term)
  }

  /// Search's field: the sheet's, not the one in the menu bar's Help menu.
  func searchField() throws -> XCUIElement {
    try wait(app.sheets.searchFields.firstMatch, "Search's field", 10)
  }

  /// Goes back from a screen pushed in a column (the submission and courseX, which are sheets on iOS).
  func back() throws {
    let buttons = app.buttons.matching(identifier: "BackButton")
    try wait(buttons.firstMatch, "a back button", 10)
    try XCTUnwrap(buttons.allElementsBoundByIndex.first { $0.isHittable }, "no back button on screen").click()
  }

  /// Closes what opened as a sheet (Search) with its Close button.
  func close() throws {
    try waitFor(label: "T_close").click()
  }

  /// Opens a row in Settings by its id and waits for the page it opens.
  func openSetting(_ row: String, page: String) throws {
    try open(tab: "tab-settings")
    try waitFor(id: row).click()
    try waitFor(id: page)
  }

  /// Flips the switch in the settings row `id` and waits for it to read `on`. `confirm` is the value naming the button
  /// that confirms the alert the switch asks first.
  func toggle(_ id: String, on: Bool, confirm: String? = nil) throws {
    let toggle = try waitFor(switchIn: id)
    toggle.click()
    if let confirm {
      try alertButton(confirm).click()
    }
    let state = NSPredicate(format: "value == %@", on ? "1" : "0")
    wait(for: [expectation(for: state, evaluatedWith: toggle)], timeout: 10)
  }

  func type(_ text: String, into field: XCUIElement) {
    field.click()
    // The login page may prefill the field.
    field.typeKey("a", modifierFlags: .command)
    field.typeKey(.delete, modifierFlags: [])
    field.typeText(text)
  }

  /// Opens `url` as a click on a link elsewhere does, through AppKit's NSWorkspace (which a Mac Catalyst test can
  /// only reach at run time). Launch Services gives it to the learnX the tests just built. Neither
  /// XCUIApplication.open(_:) nor UIApplication.open(_:) delivers it on Mac Catalyst.
  func openInWorkspace(_ url: URL) throws {
    let workspace = try XCTUnwrap(NSClassFromString("NSWorkspace") as? NSObject.Type)
      .perform(NSSelectorFromString("sharedWorkspace")).takeUnretainedValue()
    // Returns a BOOL, not an object: leave it unread.
    _ = workspace.perform(NSSelectorFromString("openURL:"), with: url)
  }

  // MARK: - Values

  /// A value from `scripts/e2e/e2e-env.mjs`: a translation (`T_<key>`) or mock text (`MOCK_*`), as Maestro takes it: a
  /// regex alternation of its English and Chinese text.
  func value(_ name: String) -> String {
    guard let value = ProcessInfo.processInfo.environment[name] else {
      XCTFail("\(name) missing; run scripts/e2e/e2e-mac.sh")
      return name
    }
    return value
  }

  /// The value `name`'s texts, unescaped. Queries compare text with these rather than match the value as a regex:
  /// `MATCHES` misses some long Chinese texts that the same regex finds (`NSRegularExpression` does).
  func texts(_ name: String) -> [String] {
    var texts = [""]
    var escaped = false
    for character in value(name) {
      if escaped {
        texts[texts.count - 1].append(character)
        escaped = false
      } else if character == "\\" {
        escaped = true
      } else if character == "|" {
        texts.append("")
      } else {
        texts[texts.count - 1].append(character)
      }
    }
    return texts
  }

  /// Elements whose `attributes` (`label`, `title`, `value`) compare with one of the value `name`'s texts, by
  /// `comparison` (`==`, `CONTAINS`, `BEGINSWITH`).
  func predicate(_ name: String, _ comparison: String, _ attributes: [String] = ["label", "title", "value"])
    -> NSPredicate
  {
    NSCompoundPredicate(
      orPredicateWithSubpredicates: texts(name).flatMap { text in
        attributes.map { NSPredicate(format: "%K \(comparison) %@", $0, text) }
      })
  }

  // MARK: - Queries

  /// The app's windows, one per scene: each scene's window has another inside it, which `app.windows` also finds.
  var windows: XCUIElementQuery { app.children(matching: .window) }

  func element(id: String) -> XCUIElement {
    app.descendants(matching: .any)[id]
  }

  func element(idMatching pattern: String) -> XCUIElement {
    element(NSPredicate(format: "identifier MATCHES %@", pattern))
  }

  func element(_ predicate: NSPredicate) -> XCUIElement {
    app.descendants(matching: .any).matching(predicate).firstMatch
  }

  /// A card (`notice-card`, …) whose text contains the value `name`.
  func card(_ id: String, _ name: String) -> XCUIElement {
    element(
      NSCompoundPredicate(andPredicateWithSubpredicates: [
        NSPredicate(format: "identifier == %@", id), predicate(name, "CONTAINS", ["label", "value"]),
      ]))
  }

  /// Text that contains the value `name`.
  func text(_ name: String) -> XCUIElement {
    element(predicate(name, "CONTAINS"))
  }

  @discardableResult
  func waitFor(id: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(id: id), "id \(id)", timeout)
  }

  @discardableResult
  func waitFor(idMatching pattern: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(idMatching: pattern), "id \(pattern)", timeout)
  }

  /// An element labeled with the value `name`, such as a header button. Not a menu bar item of the same name (File ›
  /// Close for Close).
  @discardableResult
  func waitFor(label name: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    let notMenuItem = NSPredicate(format: "elementType != %d", XCUIElement.ElementType.menuItem.rawValue)
    let labeled = predicate(name, "==", ["label", "title"])
    return try wait(
      element(NSCompoundPredicate(andPredicateWithSubpredicates: [labeled, notMenuItem])), "label \(name)", timeout)
  }

  /// Text that contains the value `name`.
  @discardableResult
  func waitFor(text name: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(text(name), "text \(name)", timeout)
  }

  /// Text matching `pattern`, a regex for all of it.
  @discardableResult
  func waitFor(matching pattern: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(element(NSPredicate(format: "label MATCHES %@ OR value MATCHES %@", pattern, pattern)), pattern, timeout)
  }

  @discardableResult
  func waitFor(card id: String, _ name: String, timeout: TimeInterval = 10) throws -> XCUIElement {
    try wait(card(id, name), "\(id) \(name)", timeout)
  }

  /// The switch in the settings row `id`.
  func waitFor(switchIn id: String) throws -> XCUIElement {
    let row = try waitFor(id: id)
    let toggle = row.switches.firstMatch
    XCTAssertTrue(toggle.waitForExistence(timeout: 5), "no switch in \(id)\n\(row.debugDescription)")
    return toggle
  }

  /// The menu item (a context or header menu's) whose title starts with the value `name` (a filter adds its count).
  func menuItem(_ name: String) throws -> XCUIElement {
    let item = app.menuItems.matching(predicate(name, "BEGINSWITH", ["label", "title"])).firstMatch
    return try wait(item, "menu item \(name)", 5)
  }

  /// The button of the alert showing, by the value `name` (an alert is a sheet on the Mac, its buttons titled).
  func alertButton(_ name: String) throws -> XCUIElement {
    let button = app.sheets.buttons.matching(predicate(name, "==", ["label", "title"])).firstMatch
    return try wait(button, "alert button \(name)", 5)
  }

  func waitForAbsence(_ element: XCUIElement, _ what: String, timeout: TimeInterval = 10) {
    let gone = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: element)
    if XCTWaiter().wait(for: [gone], timeout: timeout) != .completed {
      XCTFail("\(what) didn't go away\n\(app.debugDescription)")
    }
  }

  func waitForAbsence(card id: String, _ name: String, timeout: TimeInterval = 10) {
    waitForAbsence(card(id, name), "\(id) \(name)", timeout: timeout)
  }

  func waitForAbsence(id: String, timeout: TimeInterval = 10) {
    waitForAbsence(element(id: id), "id \(id)", timeout: timeout)
  }

  /// Waits for `element`; on a timeout fails with the app's accessibility tree, to see what showed instead.
  func wait(_ element: XCUIElement, _ what: String, _ timeout: TimeInterval) throws -> XCUIElement {
    if !element.waitForExistence(timeout: timeout) {
      XCTFail("\(what) didn't show up\n\(app.debugDescription)")
    }
    return element
  }
}
#endif
