import Foundation

/// A list the app saves to user defaults as JSON, for an App Intent to read without starting React Native or going
/// online.
struct SavedList<Item: Codable & Sendable>: Sendable {
  /// The user defaults key.
  let key: String

  /// Saves `items`, or removes the key when there are none.
  func save(_ items: [Item], to defaults: UserDefaults) {
    if items.isEmpty {
      defaults.removeObject(forKey: key)
    } else if let data = try? JSONEncoder().encode(items) {
      defaults.set(data, forKey: key)
    }
  }

  /// What was saved, or nothing if there is none or it can't be read.
  func load(from defaults: UserDefaults) -> [Item] {
    guard let data = defaults.data(forKey: key) else {
      return []
    }
    return (try? JSONDecoder().decode([Item].self, from: data)) ?? []
  }
}
