import ExpoModulesCore
import UIKit

/// What the system says about the app's background refresh, which runs the background sync.
enum BackgroundRefreshState: String {
  /// It runs.
  case on
  /// Turned off in Settings, for learnX or for every app.
  case off
  /// Paused while Low Power Mode is on.
  case lowPower
  /// Not allowed on this device (Screen Time or device management); the user may not be able to change it.
  case managed
}

/// What the state is read from; tests use a fake.
@MainActor
protocol BackgroundRefreshSystem {
  var refreshStatus: UIBackgroundRefreshStatus { get }
  var isLowPowerModeEnabled: Bool { get }
  var isMacCatalystApp: Bool { get }
}

@MainActor
struct DeviceBackgroundRefresh: BackgroundRefreshSystem {
  var refreshStatus: UIBackgroundRefreshStatus { UIApplication.shared.backgroundRefreshStatus }
  var isLowPowerModeEnabled: Bool { ProcessInfo.processInfo.isLowPowerModeEnabled }
  var isMacCatalystApp: Bool { ProcessInfo.processInfo.isMacCatalystApp }
}

/// Says whether iOS lets the background sync run, so Settings can say why notifications of new content don't come.
public final class BackgroundRefreshModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundRefresh")

    AsyncFunction("getState") { () -> String in
      MainActor.assumeIsolated {
        Self.state(of: DeviceBackgroundRefresh()).rawValue
      }
    }.runOnQueue(.main)
  }

  @MainActor
  static func state(of system: BackgroundRefreshSystem) -> BackgroundRefreshState {
    // The Mac has no such setting, and runs the task while the app is open.
    if system.isMacCatalystApp {
      return .on
    }
    switch system.refreshStatus {
    case .available:
      return .on
    case .restricted:
      return .managed
    default:
      // Low Power Mode turns it off for every app until it ends, which isn't the setting to change.
      return system.isLowPowerModeEnabled ? .lowPower : .off
    }
  }
}
