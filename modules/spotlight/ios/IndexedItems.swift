import CryptoKit
import Foundation

/// What each domain was last indexed with: a digest per item id, kept across launches so that an update after a
/// relaunch only indexes the items that changed instead of the whole domain. One JSON file per domain.
struct IndexedItems {
  /// Where the files go: the app's Application Support, or a test's own folder.
  let directory: URL

  static var standard: IndexedItems? {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first.map {
      IndexedItems(directory: $0.appendingPathComponent("LearnXSpotlight", isDirectory: true))
    }
  }

  private func file(for domain: String) -> URL {
    directory.appendingPathComponent("\(domain).json")
  }

  /// The domain's digests by item id, or nil when the app never indexed it (or forgot it after a failure).
  func load(domain: String) -> [String: String]? {
    guard let data = try? Data(contentsOf: file(for: domain)) else {
      return nil
    }
    return try? JSONDecoder().decode([String: String].self, from: data)
  }

  func save(_ digests: [String: String], domain: String) throws {
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try JSONEncoder().encode(digests).write(to: file(for: domain), options: .atomic)
  }

  func remove(domain: String) {
    try? FileManager.default.removeItem(at: file(for: domain))
  }

  func removeAll() {
    try? FileManager.default.removeItem(at: directory)
  }
}

extension SpotlightItem {
  /// Changes whenever anything the search result shows changes. Bump the version when `searchableItem` maps the
  /// fields differently, so every item is indexed again.
  var digest: String {
    struct Content: Encodable {
      let version = 1
      let title, details: String
      let keywords: [String]
      let date, dueDate: Double?
    }
    let encoder = JSONEncoder()
    encoder.outputFormatting = .sortedKeys
    let data = (try? encoder.encode(
      Content(title: title, details: details, keywords: keywords, date: date, dueDate: dueDate)
    )) ?? Data()
    return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }
}
