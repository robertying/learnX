#if targetEnvironment(macCatalyst)
import XCTest

/// learnX in the menu bar (`modules/menubar`): closing the last window keeps it running there, its item opens a window
/// again and quits it. Open at Login isn't run here, since it would add the app to the Mac's login items; its logic is
/// tested in the module.
@MainActor
final class MenuBarUITests: LearnXUITestCase {
  func testKeepsRunningInTheMenuBarWithNoWindow() throws {
    try waitFor(id: "tab-notices")
    let item = try wait(statusItem, "the menu bar item", 10)

    // Closing the last window leaves learnX running, in the menu bar only.
    try wait(windows.element(boundBy: 0).buttons["_XCUI:CloseWindow"], "the close button", 5).click()
    XCTAssertEqual(windows.count, 0)
    XCTAssertNotEqual(app.state, .notRunning)
    XCTAssertTrue(item.exists, "the menu bar item went away")

    // Open learnX brings a window back.
    item.click()
    try itemMenu("T_trayOpen").click()
    try waitFor(id: "tab-notices", timeout: 30)

    // Quit learnX ends it.
    item.click()
    try itemMenu("T_trayQuit").click()
    XCTAssertTrue(app.wait(for: .notRunning, timeout: 10), "learnX didn't quit")
  }

  /// The app's item in the menu bar, named learnX for VoiceOver (`ios/MacMenuBar`).
  private var statusItem: XCUIElement {
    app.statusItems.matching(NSPredicate(format: "label == %@", "learnX")).firstMatch
  }

  /// An item of the menu bar item's menu: the app menu has a Quit learnX of its own.
  private func itemMenu(_ name: String) throws -> XCUIElement {
    let item = statusItem.menuItems.matching(predicate(name, "BEGINSWITH", ["label", "title"])).firstMatch
    return try wait(item, "menu bar item's \(name)", 5)
  }
}
#endif
