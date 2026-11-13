import ExpoModulesCore

/// Hands files shared through the share extension to JS. The extension saves the file (`SharedFileInbox`) and opens
/// `learnx://`; the link reaches `ShareAppDelegateSubscriber`, which tells a listening module to send it. Before JS
/// listens (the link that launched the app), the file waits in the app group until `takeSharedItem`. Also saves files
/// where people pick (`saveFile`).
public final class ShareModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXShare")

    Events("onShare")

    OnStartObserving(nil, startObserving)
    OnStopObserving(nil, stopObserving)

    Function("takeSharedItem", Self.takeSharedItem)
    Function("getSharedFilesDirectory", Self.getSharedFilesDirectory)

    AsyncFunction("saveFile") { (url: URL) async throws -> Bool in
      try await Self.saveFile(url)
    }
  }

  @MainActor static let saver = FileSaver()

  /// Whether the file was saved where people picked. Throws when there is no window to ask in.
  @MainActor static func saveFile(_ url: URL) async throws -> Bool {
    guard let presenter = presenter() else {
      throw NoWindowError()
    }
    return await withCheckedContinuation { continuation in
      saver.save(url, from: presenter) { continuation.resume(returning: $0) }
    }
  }

  /// What the key window shows on top, to present the save panel from.
  @MainActor static func presenter() -> UIViewController? {
    let window = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)
    var top = window?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }

  /// The app's inbox, in the group the share extension shares with it (`LearnXAppGroup` in both Info.plists).
  static var inbox: SharedFileInbox? {
    SharedFileInbox(bundle: .main)
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

struct NoWindowError: LocalizedError {
  var errorDescription: String? { "No window to ask where to save in" }
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
