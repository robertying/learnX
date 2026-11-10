import ExpoModulesCore
import UIKit

public final class MenusModule: Module {
  private var observer: NSObjectProtocol?

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
    // Commands are posted on the main thread, from the menu bar or a key command.
    observer = NotificationCenter.default.addObserver(
      forName: AppCommands.notification,
      object: nil,
      queue: nil
    ) { [weak self] notification in
      guard let command = notification.userInfo?[AppCommands.commandKey] as? String else {
        return
      }
      self?.sendEvent("onCommand", ["command": command])
    }
  }

  func stopObserving() {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
  }
}
