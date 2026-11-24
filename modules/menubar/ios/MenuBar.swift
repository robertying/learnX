import UIKit

/// The app's windows as `MenuBar` sees them, behind a protocol so tests use a fake.
@MainActor
protocol AppWindows {
  var hasOpenWindow: Bool { get }
  /// Brings an open window to the front, or opens a new one; returns whether a new one is coming.
  func showWindow() -> Bool
}

extension UIApplication: AppWindows {
  var hasOpenWindow: Bool {
    connectedScenes.contains { $0 is UIWindowScene }
  }

  func showWindow() -> Bool {
    let session = connectedScenes.first { $0 is UIWindowScene }?.session
    requestSceneSessionActivation(session, userActivity: nil, options: nil)
    return session == nil
  }
}

/// The Mac app in the menu bar: its item there stays while learnX runs, so it keeps syncing and notifying with its
/// windows closed, and the Dock shows learnX only while it has a window open. Opened as a login item, it opens no
/// window. Does nothing on iPhone and iPad, where the plugin doesn't load.
@MainActor
public enum MenuBar {
  /// Posted when Check for New Content is chosen; `MenuBarModule` passes it on to JS.
  nonisolated static let checkForNewContent = Notification.Name("LXMenuBarCheckForNewContent")

  /// AppKit's notification that the app came to the front, which UIKit doesn't post on the Mac.
  nonisolated static let didBecomeActive = Notification.Name("NSApplicationDidBecomeActiveNotification")

  private static var host: (any MenuBarHosting)?
  private static var windows: (any AppWindows)?
  private static var activationObserver: (any NSObjectProtocol)?

  /// Whether windows that connect now are closed again: learnX was opened as a login item and nobody has asked for
  /// a window since.
  public private(set) static var opensHidden = false

  /// Whether a new window was asked for and hasn't connected yet, so coming to the front for it doesn't ask again.
  private static var windowRequested = false

  /// Loads the plugin and reads how learnX was launched. Call while the app finishes launching, before any window
  /// connects.
  public static func start() {
    start(host: MenuBarPlugin.makeHost(), windows: UIApplication.shared)
  }

  static func start(host: (any MenuBarHosting)?, windows: any AppWindows, center: NotificationCenter = .default) {
    guard let host else {
      return
    }
    self.host = host
    self.windows = windows
    opensHidden = host.launchedAsLoginItem
    if opensHidden {
      host.setShowsInDock(false)
    }
    // Opening learnX from Finder, Spotlight or a notification brings it to the front, which asks for a window.
    activationObserver = center.addObserver(forName: didBecomeActive, object: nil, queue: nil) { _ in
      MainActor.assumeIsolated {
        if !windowRequested, opensHidden || MenuBar.windows?.hasOpenWindow == false {
          open()
        }
      }
    }
  }

  /// Whether a window that's connecting stays open. Shows learnX in the Dock if so.
  public static func windowWillConnect() -> Bool {
    guard !opensHidden else {
      return false
    }
    windowRequested = false
    host?.setShowsInDock(true)
    return true
  }

  /// Leaves learnX only in the menu bar once its last window has closed.
  public static func windowDidDisconnect(remainingWindows: Int) {
    if remainingWindows == 0 {
      host?.setShowsInDock(false)
    }
  }

  /// Shows the menu bar item with its menu titled in the app's language.
  static func showItem(openTitle: String, checkTitle: String, quitTitle: String) {
    host?.showStatusItem(
      openTitle: openTitle,
      checkTitle: checkTitle,
      quitTitle: quitTitle,
      onOpen: { open() },
      onCheck: { NotificationCenter.default.post(name: checkForNewContent, object: nil) }
    )
  }

  /// Brings learnX to the front with a window: the one open, or a new one.
  static func open() {
    opensHidden = false
    host?.setShowsInDock(true)
    host?.activate()
    // A new window connects later; an open one only comes to the front.
    windowRequested = windows?.showWindow() ?? false
  }

  /// Forgets the host and the state, for tests.
  static func reset(center: NotificationCenter = .default) {
    if let activationObserver {
      center.removeObserver(activationObserver)
    }
    activationObserver = nil
    host = nil
    windows = nil
    opensHidden = false
    windowRequested = false
  }
}

/// Loads the Mac's menu bar plugin (`MacMenuBar.bundle` in the app's PlugIns, built from `ios/MacMenuBar`).
enum MenuBarPlugin {
  private static let hostClass: NSObject.Type? = {
    #if targetEnvironment(macCatalyst)
      guard let url = Bundle.main.builtInPlugInsURL?.appendingPathComponent("MacMenuBar.bundle"),
        let bundle = Bundle(url: url),
        bundle.load(),
        let hostClass = bundle.principalClass as? NSObject.Type,
        hostClass.conforms(to: MenuBarHosting.self)
      else {
        return nil
      }
      return hostClass
    #else
      return nil
    #endif
  }()

  @MainActor static func makeHost() -> (any MenuBarHosting)? {
    hostClass?.init() as? any MenuBarHosting
  }
}
