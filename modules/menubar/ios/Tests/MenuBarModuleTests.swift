@testable import ExpoModulesCore
import Foundation
import Testing

@testable import LearnXMenuBar

/// The module as JS sees it; what its functions do is MenuBar's and OpenAtLogin's (their tests).
@MainActor
@Suite(.serialized) struct MenuBarModuleTests {
  @Test func definesItsFunctions() {
    let functions = MenuBarModule(appContext: AppContext()).definition().functions
    #expect(Set(functions.keys) == ["showItem", "getOpenAtLogin", "setOpenAtLogin"])
  }

  @Test func showsTheItemWithTheLabelsFromJS() {
    // Off the Mac there's no plugin to show the item, so this only reads the labels.
    MenuBar.reset()
    let labels = MenuBarLabels()
    labels.open = "Open learnX"
    labels.checkForNewContent = "Check for New Content"
    labels.quit = "Quit learnX"
    MenuBarModule.showItem(labels)
  }

  #if !targetEnvironment(macCatalyst)
    @Test func neverOpensAtLoginOffTheMac() throws {
      #expect(MenuBarModule.getOpenAtLogin() == "off")
      #expect(try MenuBarModule.setOpenAtLogin(true) == "off")
      #expect(try MenuBarModule.setOpenAtLogin(false) == "off")
    }
  #endif

  @Test func forwardsCheckForNewContentWhileJSListens() {
    let module = MenuBarModule(appContext: AppContext())
    module.startObserving()
    // Sent as an event (dropped here, with no JS runtime).
    NotificationCenter.default.post(name: MenuBar.checkForNewContent, object: nil)
    module.stopObserving()
    NotificationCenter.default.post(name: MenuBar.checkForNewContent, object: nil)
  }
}
