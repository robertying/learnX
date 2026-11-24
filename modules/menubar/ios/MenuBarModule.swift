import ExpoModulesCore
import UIKit

/// The labels of the menu bar item's menu, from JS in the app's language.
struct MenuBarLabels: Record {
  @Field var open = ""
  @Field var checkForNewContent = ""
  @Field var quit = ""
}

/// The Mac's menu bar item and Open at Login for JS (`modules/menubar/index.ts`).
public final class MenuBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MenuBar")

    Events("onCheckForNewContent")

    OnStartObserving(nil, startObserving)
    OnStopObserving(nil, stopObserving)

    AsyncFunction("showItem", Self.showItem).runOnQueue(.main)
    AsyncFunction("getOpenAtLogin", Self.getOpenAtLogin).runOnQueue(.main)
    AsyncFunction("setOpenAtLogin", Self.setOpenAtLogin).runOnQueue(.main)
  }

  // Run on the main queue (`runOnQueue(.main)`), so on the main actor.

  static func showItem(_ labels: MenuBarLabels) {
    MainActor.assumeIsolated {
      MenuBar.showItem(openTitle: labels.open, checkTitle: labels.checkForNewContent, quitTitle: labels.quit)
    }
  }

  static func getOpenAtLogin() -> String {
    MainActor.assumeIsolated {
      SystemLoginItem().state.rawValue
    }
  }

  static func setOpenAtLogin(_ on: Bool) throws -> String {
    try MainActor.assumeIsolated {
      try OpenAtLogin.set(on, service: SystemLoginItem()).rawValue
    }
  }

  func startObserving() {
    // A selector, unlike a block, doesn't hand the (non-Sendable) module to a @Sendable closure.
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(checkForNewContent),
      name: MenuBar.checkForNewContent,
      object: nil
    )
  }

  func stopObserving() {
    NotificationCenter.default.removeObserver(self, name: MenuBar.checkForNewContent, object: nil)
  }

  @objc private func checkForNewContent() {
    sendEvent("onCheckForNewContent")
  }
}
