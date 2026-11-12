import Foundation
import UniformTypeIdentifiers

/// Where a file shared to learnX waits for the app: the share extension (ios/ShareExtension) copies it into the app
/// group's `Library/Caches/<uuid>/<name>` and records it in the group's user defaults, and the app takes it from there
/// once. Compiled into both the share extension and this module.
struct SharedFileInbox {
  /// The key both sides use in the group's user defaults.
  static let key = "LearnXSharedFile"

  let defaults: UserDefaults
  /// The group's `Library/Caches`, where each shared file gets a folder of its own.
  let directory: URL

  init(defaults: UserDefaults, directory: URL) {
    self.defaults = defaults
    self.directory = directory
  }

  /// The app group's inbox, or nil without access to the group.
  init?(appGroup: String) {
    guard let defaults = UserDefaults(suiteName: appGroup),
      let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    else {
      return nil
    }
    self.init(defaults: defaults, directory: container.appendingPathComponent("Library/Caches", isDirectory: true))
  }

  /// The first attachment that has a file representation, with its most specific type.
  static func firstFile(in items: [NSExtensionItem]) -> (provider: NSItemProvider, type: UTType)? {
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

  /// Copies the file into a folder of its own, so it keeps its name (the attachment's name) without clashing, and
  /// records it for the app. Runs on the caller's actor, so the share extension's main-actor provider isn't sent
  /// elsewhere; the copy itself happens in the provider's callback.
  @discardableResult
  nonisolated(nonsending) func save(_ provider: NSItemProvider, type: UTType) async throws -> URL {
    let folder = directory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let suggestedName = provider.suggestedName
    let file: URL = try await withCheckedThrowingContinuation { continuation in
      // The URL is only valid until this returns.
      _ = provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { url, error in
        guard let url else {
          continuation.resume(throwing: error ?? CocoaError(.fileReadUnknown))
          return
        }
        let destination = folder.appendingPathComponent(
          Self.fileName(suggested: suggestedName, url: url, type: type)
        )
        do {
          try FileManager.default.copyItem(at: url, to: destination)
          continuation.resume(returning: destination)
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
    defaults.set(
      ["uri": file.absoluteString, "mimeType": type.preferredMIMEType ?? "application/octet-stream"],
      forKey: Self.key
    )
    return file
  }

  /// The attachment's name, with the type's extension (or the file's) if it has none. The sending app picks the
  /// suggested name, so it can't name a path: slashes and colons become `_` and leading dots go.
  static func fileName(suggested: String?, url: URL, type: UTType) -> String {
    var name = safeName(suggested) ?? url.deletingPathExtension().lastPathComponent
    if let ext = type.preferredFilenameExtension ?? (url.pathExtension.isEmpty ? nil : url.pathExtension),
      (name as NSString).pathExtension.isEmpty
    {
      name += ".\(ext)"
    }
    return name
  }

  /// `name` as a single path component, or nil if nothing is left of it.
  static func safeName(_ name: String?) -> String? {
    guard let name else {
      return nil
    }
    let flat = name.map { "/:\0".contains($0) ? "_" : String($0) }.joined()
    let trimmed = String(flat.drop { $0 == "." || $0.isWhitespace })
    return trimmed.isEmpty ? nil : trimmed
  }

  /// Takes the waiting file, if any, so it's handed to JS once.
  func take() -> [String: String]? {
    guard let file = defaults.dictionary(forKey: Self.key) as? [String: String],
      let uri = file["uri"]
    else {
      return nil
    }
    defaults.removeObject(forKey: Self.key)
    return ["kind": "file", "uri": uri, "mimeType": file["mimeType"] ?? "application/octet-stream"]
  }
}
