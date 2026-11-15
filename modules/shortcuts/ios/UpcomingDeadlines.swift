import Foundation

/// An open assignment, as the app last saw it.
public struct UpcomingDeadline: Codable, Sendable {
  public let id: String
  public let title: String
  public let courseName: String
  public let deadline: Date
}

/// The open assignments' deadlines, saved by the app whenever its assignments change, for the "Next Deadline" App
/// Intent.
public enum UpcomingDeadlines {
  static let list = SavedList<UpcomingDeadline>(key: "LearnXUpcomingDeadlines")

  static func save(_ deadlines: [UpcomingDeadline], to defaults: UserDefaults = .standard) {
    list.save(deadlines, to: defaults)
  }

  /// The deadlines still ahead, earliest first.
  public static func load(after date: Date = .now, from defaults: UserDefaults = .standard) -> [UpcomingDeadline] {
    list.load(from: defaults).filter { $0.deadline > date }.sorted { $0.deadline < $1.deadline }
  }
}
