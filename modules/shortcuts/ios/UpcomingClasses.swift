import Foundation

/// A class meeting, as the app last saw the timetable.
public struct UpcomingClass: Codable, Sendable {
  public let courseName: String
  public let location: String
  public let start: Date
  public let end: Date
}

/// The classes still ahead (this week's and next week's), saved by the app whenever its timetable changes, for the
/// "Next Class" App Intent.
public enum UpcomingClasses {
  static let list = SavedList<UpcomingClass>(key: "LearnXUpcomingClasses")

  static func save(_ classes: [UpcomingClass], to defaults: UserDefaults = .standard) {
    list.save(classes, to: defaults)
  }

  /// The classes not over yet at `date`, the one going on included, earliest first.
  public static func load(at date: Date = .now, from defaults: UserDefaults = .standard) -> [UpcomingClass] {
    list.load(from: defaults).filter { $0.end > date }.sorted { $0.start < $1.start }
  }
}
