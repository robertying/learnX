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

  @Test func forwardsCheckForNewContentWhileJSListens() {
    let module = MenuBarModule(appContext: AppContext())
    module.startObserving()
    // Sent as an event (dropped here, with no JS runtime).
    NotificationCenter.default.post(name: MenuBar.checkForNewContent, object: nil)
    module.stopObserving()
    NotificationCenter.default.post(name: MenuBar.checkForNewContent, object: nil)
  }
}
