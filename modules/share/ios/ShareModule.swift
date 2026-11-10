import ExpoModulesCore

/// Hands files shared through the share extension to JS. The extension saves the file (`SharedFileInbox`) and opens
/// `learnx://`; the link reaches `ShareAppDelegateSubscriber`, which tells a listening module to send it. Before JS
/// listens (the link that launched the app), the file waits in the app group until `takeSharedItem`.
public final class ShareModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("LearnXShare")

    Events("onShare")

    OnStartObserving(nil, startObserving)
    OnStopObserving(nil, stopObserving)

    Function("takeSharedItem", Self.takeSharedItem)
    Function("getSharedFilesDirectory", Self.getSharedFilesDirectory)
  }

  /// The app's inbox, in the group the share extension shares with it.
  static var inbox: SharedFileInbox? {
    Bundle.main.bundleIdentifier.flatMap { SharedFileInbox(appGroup: "group.\($0)") }
  }

  func startObserving() {
    // The subscriber posts on the main thread, from the app delegate.
    observer = NotificationCenter.default.addObserver(
      forName: ShareAppDelegateSubscriber.notification,
      object: nil,
      queue: nil
    ) { [weak self] _ in
      if let item = Self.takeSharedItem() {
        self?.sendEvent("onShare", item)
      }
    }
  }

  func stopObserving() {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
  }

  static func takeSharedItem() -> [String: String]? {
    inbox?.take()
  }

  /// The folder `removeFileDir` clears.
  static func getSharedFilesDirectory() -> String? {
    inbox?.directory.absoluteString
  }
}

/// Notices links that may come from the share extension. Other modules (React Native's Linking) handle the link
/// itself, so this never claims it.
public final class ShareAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  static let notification = Notification.Name("io.robertying.learnx.SharedFile")

  public func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if url.scheme == "learnx" {
      NotificationCenter.default.post(name: Self.notification, object: nil)
    }
    return false
  }
}
