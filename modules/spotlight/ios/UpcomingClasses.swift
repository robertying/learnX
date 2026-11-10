import Foundation

/// A class meeting, as the app last saw the timetable.
public struct UpcomingClass: Codable, Sendable {
  public let courseName: String
  public let location: String
  public let start: Date
  public let end: Date
}

/// The classes still ahead (this week's and next week's), saved by the app whenever its timetable changes, so the
/// "Next Class" App Intent can answer without starting React Native or going online.
public enum UpcomingClasses {
  static let key = "LearnXUpcomingClasses"

  static func save(_ classes: [UpcomingClass], to defaults: UserDefaults = .standard) {
    if classes.isEmpty {
      defaults.removeObject(forKey: key)
    } else if let data = try? JSONEncoder().encode(classes) {
      defaults.set(data, forKey: key)
    }
  }

  /// The classes not over yet at `date`, the one going on included, earliest first.
  public static func load(at date: Date = .now, from defaults: UserDefaults = .standard) -> [UpcomingClass] {
    guard let data = defaults.data(forKey: key),
      let classes = try? JSONDecoder().decode([UpcomingClass].self, from: data)
    else {
      return []
    }
    return classes.filter { $0.end > date }.sorted { $0.start < $1.start }
  }
}
