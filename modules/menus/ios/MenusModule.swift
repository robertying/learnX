import ExpoModulesCore
import UIKit

public final class MenusModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("Menus")

    Events("onCommand")

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: AppCommands.notification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let command = notification.userInfo?[AppCommands.commandKey] as? String else {
          return
        }
        self?.sendEvent("onCommand", ["command": command])
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }

    View(ContextMenuView.self) {
      Events("onAction")

      Prop("actions") { (view: ContextMenuView, actions: [ContextMenuAction]) in
        view.setActions(actions)
      }
    }
  }
}
