import ExpoModulesCore
import UIKit

public final class WindowsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXWindows")

    Events("onActiveChange")

    OnStartObserving(nil, startObserving)
    OnStopObserving(nil, stopObserving)

    Function("supportsMultipleWindows") { WindowTracker.supportsMultipleWindows }

    Function("targetWindowId") { WindowTracker.targetWindowId }

    Function("setWindowLink") { (windowId: String, link: String?) in
      WindowTracker.setLink(link, for: windowId)
    }

    AsyncFunction("setWindowTitle") { (windowId: String, title: String) in
      MainActor.assumeIsolated {
        WindowTracker.setTitle(title, for: windowId)
      }
    }.runOnQueue(.main)

    AsyncFunction("openWindow") { (link: String) in
      guard let url = URL(string: link) else {
        return
      }
      MainActor.assumeIsolated {
        WindowTracker.open(url)
      }
    }.runOnQueue(.main)
  }

  func startObserving() {
    for name in AppActivation.notifications {
      // A selector, unlike a block, doesn't hand the (non-Sendable) module to a @Sendable closure.
      NotificationCenter.default.addObserver(self, selector: #selector(activationChanged(_:)), name: name, object: nil)
    }
  }

  func stopObserving() {
    for name in AppActivation.notifications {
      NotificationCenter.default.removeObserver(self, name: name, object: nil)
    }
  }

  @objc private func activationChanged(_ notification: Notification) {
    if let active = AppActivation.isActive(after: notification.name) {
      sendEvent("onActiveChange", ["active": active])
    }
  }
}
