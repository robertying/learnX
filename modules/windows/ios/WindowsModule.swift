import ExpoModulesCore
import UIKit

public final class WindowsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXWindows")

    Function("supportsMultipleWindows") { WindowTracker.supportsMultipleWindows }

    Function("targetWindowId") { WindowTracker.targetWindowId }

    Function("setWindowLink") { (windowId: String, link: String?) in
      WindowTracker.setLink(link, for: windowId)
    }

    AsyncFunction("openWindow") { (link: String) in
      guard let url = URL(string: link) else {
        return
      }
      MainActor.assumeIsolated {
        WindowTracker.open(url)
      }
    }.runOnQueue(.main)
  }
}
