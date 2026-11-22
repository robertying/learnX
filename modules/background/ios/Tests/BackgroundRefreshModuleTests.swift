import ExpoModulesCore
import Testing
import UIKit

@testable import LearnXBackground

struct FakeSystem: BackgroundRefreshSystem {
  var refreshStatus: UIBackgroundRefreshStatus = .available
  var isLowPowerModeEnabled = false
  var isMacCatalystApp = false
}

@MainActor
@Suite struct BackgroundRefreshModuleTests {
  @Test func definesItsFunctions() {
    _ = BackgroundRefreshModule(appContext: AppContext()).definition()
  }

  @Test func isOnWhenAvailable() {
    #expect(BackgroundRefreshModule.state(of: FakeSystem()) == .on)
  }

  @Test func isOffWhenDenied() {
    #expect(BackgroundRefreshModule.state(of: FakeSystem(refreshStatus: .denied)) == .off)
  }

  @Test func isPausedInLowPowerMode() {
    let system = FakeSystem(refreshStatus: .denied, isLowPowerModeEnabled: true)
    #expect(BackgroundRefreshModule.state(of: system) == .lowPower)
  }

  @Test func isOnInLowPowerModeWhenStillAvailable() {
    let system = FakeSystem(refreshStatus: .available, isLowPowerModeEnabled: true)
    #expect(BackgroundRefreshModule.state(of: system) == .on)
  }

  @Test func isManagedWhenRestricted() {
    #expect(BackgroundRefreshModule.state(of: FakeSystem(refreshStatus: .restricted)) == .managed)
  }

  @Test func isAlwaysOnOnTheMac() {
    let system = FakeSystem(refreshStatus: .denied, isMacCatalystApp: true)
    #expect(BackgroundRefreshModule.state(of: system) == .on)
  }

  @Test func readsTheDevice() {
    // The test host has background refresh as the simulator has it; only that it answers.
    _ = BackgroundRefreshModule.state(of: DeviceBackgroundRefresh())
  }
}
