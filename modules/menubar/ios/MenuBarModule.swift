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

    AsyncFunction("showItem") { (labels: MenuBarLabels) in
      MainActor.assumeIsolated {
        MenuBar.showItem(openTitle: labels.open, checkTitle: labels.checkForNewContent, quitTitle: labels.quit)
      }
    }.runOnQueue(.main)

    AsyncFunction("getOpenAtLogin") { () -> String in
      MainActor.assumeIsolated {
        SystemLoginItem().state.rawValue
      }
    }.runOnQueue(.main)

    AsyncFunction("setOpenAtLogin") { (on: Bool) throws -> String in
      try MainActor.assumeIsolated {
        try OpenAtLogin.set(on, service: SystemLoginItem()).rawValue
      }
    }.runOnQueue(.main)
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
