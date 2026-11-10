import UIKit
import UniformTypeIdentifiers

/// learnX's share extension. It shows nothing: it copies the first shared file into the app group, leaves its
/// location for the app (`SharedFileStore` in modules/share reads it), and opens learnX, which offers the file as an
/// attachment to the next assignment submission. Only files activate it (Info.plist), not plain text.
///
/// Opening the app needs `UIApplication.shared`, which an extension isn't meant to reach; the class is marked
/// unavailable to extensions so it compiles, and the call works at run time.
@available(iOSApplicationExtension, unavailable)
final class ShareViewController: UIViewController {
  /// Shared with the app's `SharedFileStore`.
  private static let sharedFileKey = "LearnXSharedFile"

  private var appGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "LearnXAppGroup") as? String
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    Task {
      await saveSharedFile()
      openApp()
    }
  }

  /// Copies the file and records it. On any failure the app still opens, with nothing new to attach.
  private func saveSharedFile() async {
    guard let appGroup,
      let defaults = UserDefaults(suiteName: appGroup),
      let caches = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
        .appendingPathComponent("Library/Caches", isDirectory: true),
      let shared = firstFile()
    else {
      return
    }
    let type = shared.type
    do {
      let file = try await copy(shared.provider, type: type, into: caches)
      defaults.set(
        ["uri": file.absoluteString, "mimeType": type.preferredMIMEType ?? "application/octet-stream"],
        forKey: Self.sharedFileKey
      )
    } catch {
      NSLog("learnX share extension: couldn't copy the shared file: \(error)")
    }
  }

  /// The first attachment that has a file representation, with its most specific type.
  private func firstFile() -> (provider: NSItemProvider, type: UTType)? {
    let items = extensionContext?.inputItems as? [NSExtensionItem] ?? []
    for provider in items.flatMap({ $0.attachments ?? [] }) {
      let type = provider.registeredTypeIdentifiers
        .compactMap(UTType.init)
        .first { $0.conforms(to: .data) }
      if let type {
        return (provider: provider, type: type)
      }
    }
    return nil
  }

  /// Copies the file into its own folder, so it keeps its name (the attachment's name) without clashing.
  private func copy(_ provider: NSItemProvider, type: UTType, into caches: URL) async throws -> URL {
    let folder = caches.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    return try await withCheckedThrowingContinuation { continuation in
      // The URL is only valid until this returns.
      _ = provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { url, error in
        guard let url else {
          continuation.resume(throwing: error ?? CocoaError(.fileReadUnknown))
          return
        }
        var name = provider.suggestedName ?? url.deletingPathExtension().lastPathComponent
        if let ext = type.preferredFilenameExtension ?? (url.pathExtension.isEmpty ? nil : url.pathExtension),
          (name as NSString).pathExtension.isEmpty
        {
          name += ".\(ext)"
        }
        let destination = folder.appendingPathComponent(name)
        do {
          try FileManager.default.copyItem(at: url, to: destination)
          continuation.resume(returning: destination)
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func openApp() {
    guard let url = URL(string: "learnx://") else {
      return
    }
    UIApplication.shared.open(url) { [weak self] _ in
      self?.extensionContext?.completeRequest(returningItems: nil)
    }
  }
}
