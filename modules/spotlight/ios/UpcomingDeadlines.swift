import Foundation

/// An open assignment, as the app last saw it.
public struct UpcomingDeadline: Codable, Sendable {
  public let id: String
  public let title: String
  public let courseName: String
  public let deadline: Date
}

/// The open assignments' deadlines, saved by the app whenever its assignments change, so the "Next Deadline" App
/// Intent can answer without starting React Native or going online.
public enum UpcomingDeadlines {
  private static let key = "LearnXUpcomingDeadlines"

  static func save(_ deadlines: [UpcomingDeadline]) {
    if deadlines.isEmpty {
      UserDefaults.standard.removeObject(forKey: key)
    } else if let data = try? JSONEncoder().encode(deadlines) {
      UserDefaults.standard.set(data, forKey: key)
    }
  }

  /// The deadlines still ahead, earliest first.
  public static func load(after date: Date = .now) -> [UpcomingDeadline] {
    guard let data = UserDefaults.standard.data(forKey: key),
      let deadlines = try? JSONDecoder().decode([UpcomingDeadline].self, from: data)
    else {
      return []
    }
    return deadlines.filter { $0.deadline > date }.sorted { $0.deadline < $1.deadline }
  }
}
