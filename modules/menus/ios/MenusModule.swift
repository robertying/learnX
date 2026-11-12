import ExpoModulesCore
import UIKit

public final class MenusModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Menus")

    Events("onCommand")

    OnStartObserving(nil, startObserving)
    OnStopObserving(nil, stopObserving)

    View(ContextMenuView.self) {
      Events("onAction")

      Prop("actions") { (view: ContextMenuView, actions: [ContextMenuAction]) in
        view.setActions(actions)
      }
    }
  }

  func startObserving() {
    // Commands are posted on the main thread, from the menu bar or a key command. A selector, unlike a block,
    // doesn't hand the (non-Sendable) module to a @Sendable closure.
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(commandPosted(_:)),
      name: AppCommands.notification,
      object: nil
    )
  }

  func stopObserving() {
    NotificationCenter.default.removeObserver(self, name: AppCommands.notification, object: nil)
  }

  @objc private func commandPosted(_ notification: Notification) {
    guard let command = notification.userInfo?[AppCommands.commandKey] as? String else {
      return
    }
    sendEvent("onCommand", ["command": command])
  }
}
