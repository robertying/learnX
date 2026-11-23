import Foundation

#if targetEnvironment(macCatalyst)
  import ServiceManagement
#endif

/// Whether learnX opens at login.
enum OpenAtLoginState: String {
  case on
  case off
  /// Turned off in System Settings › General › Login Items, where only the user can turn it back on.
  case requiresApproval
}

/// The login item learnX is, behind a protocol so tests use a fake.
@MainActor
protocol LoginItemService {
  var state: OpenAtLoginState { get }
  func register() throws
  func unregister() throws
  /// Opens System Settings › General › Login Items.
  func openSystemSettings()
}

enum OpenAtLogin {
  /// Adds learnX to the login items or removes it, and returns the state after. Where the user turned it off in
  /// System Settings, the app can't turn it back on, so it opens System Settings for them.
  @MainActor
  static func set(_ on: Bool, service: some LoginItemService) throws -> OpenAtLoginState {
    switch (on, service.state) {
    case (true, .on), (false, .off):
      break
    case (true, .off):
      try service.register()
      if service.state == .requiresApproval {
        service.openSystemSettings()
      }
    case (true, .requiresApproval):
      service.openSystemSettings()
    case (false, .on), (false, .requiresApproval):
      try service.unregister()
    }
    return service.state
  }
}

/// The app itself as a login item, with `SMAppService` on the Mac; never one on iPhone and iPad.
@MainActor
struct SystemLoginItem: LoginItemService {
  #if targetEnvironment(macCatalyst)
    var state: OpenAtLoginState {
      switch SMAppService.mainApp.status {
      case .enabled: .on
      case .requiresApproval: .requiresApproval
      default: .off
      }
    }

    func register() throws {
      try SMAppService.mainApp.register()
    }

    func unregister() throws {
      try SMAppService.mainApp.unregister()
    }

    func openSystemSettings() {
      SMAppService.openSystemSettingsLoginItems()
    }
  #else
    var state: OpenAtLoginState { .off }
    func register() throws {}
    func unregister() throws {}
    func openSystemSettings() {}
  #endif
}
