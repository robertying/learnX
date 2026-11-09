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
  private static let key = "LearnXUpcomingClasses"

  static func save(_ classes: [UpcomingClass]) {
    if classes.isEmpty {
      UserDefaults.standard.removeObject(forKey: key)
    } else if let data = try? JSONEncoder().encode(classes) {
      UserDefaults.standard.set(data, forKey: key)
    }
  }

  /// The classes not over yet at `date`, the one going on included, earliest first.
  public static func load(at date: Date = .now) -> [UpcomingClass] {
    guard let data = UserDefaults.standard.data(forKey: key),
      let classes = try? JSONDecoder().decode([UpcomingClass].self, from: data)
    else {
      return []
    }
    return classes.filter { $0.end > date }.sorted { $0.start < $1.start }
  }
}
