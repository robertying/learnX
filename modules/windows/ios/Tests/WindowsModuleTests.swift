import ExpoModulesCore
import Testing
import UIKit

@testable import LearnXWindows

/// The module as JS sees it; what its functions do is WindowTracker's (WindowTrackerTests).
@MainActor
@Suite(.serialized) struct WindowsModuleTests {
  @Test func definesItsFunctions() {
    let functions = WindowsModule(appContext: AppContext()).definition().functions
    #expect(
      Set(functions.keys) == [
        "supportsMultipleWindows", "targetWindowId", "setWindowLink", "setWindowTitle", "openWindow",
      ])
  }

  @Test func forwardsTheMacAppsActivationWhileJSListens() {
    let module = WindowsModule(appContext: AppContext())
    module.startObserving()
    // Sent as events (dropped here, with no JS runtime).
    for name in AppActivation.notifications {
      NotificationCenter.default.post(name: name, object: nil)
    }
    module.stopObserving()
    // Nothing is listening any more.
    for name in AppActivation.notifications {
      NotificationCenter.default.post(name: name, object: nil)
    }
  }
}
