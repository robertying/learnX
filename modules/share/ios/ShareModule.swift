import ExpoModulesCore

/// The file the share extension (ios/ShareExtension) last copied into the app group, as it left it in the group's
/// user defaults. Both sides use these keys.
enum SharedFileStore {
  static let key = "LearnXSharedFile"

  static var appGroup: String? {
    Bundle.main.bundleIdentifier.map { "group.\($0)" }
  }

  /// Takes the waiting file, if any, so it's handed to JS once.
  static func take() -> [String: String]? {
    guard let appGroup, let defaults = UserDefaults(suiteName: appGroup),
      let file = defaults.dictionary(forKey: key) as? [String: String],
      let uri = file["uri"]
    else {
      return nil
    }
    defaults.removeObject(forKey: key)
    return ["kind": "file", "uri": uri, "mimeType": file["mimeType"] ?? "application/octet-stream"]
  }

  static var directory: URL? {
    appGroup.flatMap { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: $0) }?
      .appendingPathComponent("Library/Caches", isDirectory: true)
  }
}

/// Hands files shared through the share extension to JS. The extension saves the file and opens `learnx://`; the
/// link reaches `ShareAppDelegateSubscriber`, which tells a listening module to send it. Before JS listens (the link
/// that launched the app), the file waits in the app group until `takeSharedItem`.
public final class ShareModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("LearnXShare")

    Events("onShare")

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: ShareAppDelegateSubscriber.notification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        if let item = SharedFileStore.take() {
          self?.sendEvent("onShare", item)
        }
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }

    Function("takeSharedItem") { () -> [String: String]? in
      SharedFileStore.take()
    }

    Function("getSharedFilesDirectory") { () -> String? in
      SharedFileStore.directory?.absoluteString
    }
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
