import ExpoModulesCore

/// Hands files shared through the share extension to JS. The extension saves the file (`SharedFileInbox`) and opens
/// `learnx://`; the link reaches `ShareAppDelegateSubscriber`, which tells a listening module to send it. Before JS
/// listens (the link that launched the app), the file waits in the app group until `takeSharedItem`.
public final class ShareModule: Module {
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
    // The subscriber posts on the main thread, from the app delegate. A selector, unlike a block, doesn't hand the
    // (non-Sendable) module to a @Sendable closure.
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(linkOpened),
      name: ShareAppDelegateSubscriber.notification,
      object: nil
    )
  }

  func stopObserving() {
    NotificationCenter.default.removeObserver(self, name: ShareAppDelegateSubscriber.notification, object: nil)
  }

  @objc private func linkOpened() {
    if let item = Self.takeSharedItem() {
      sendEvent("onShare", item)
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
  nonisolated static let notification = Notification.Name("io.robertying.learnx.SharedFile")

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
