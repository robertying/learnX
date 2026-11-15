import ExpoModulesCore

struct UpcomingDeadlineRecord: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var courseName: String = ""
  /// Milliseconds since the epoch.
  @Field var deadline: Double = 0

  var upcomingDeadline: UpcomingDeadline {
    UpcomingDeadline(id: id, title: title, courseName: courseName, deadline: Date(milliseconds: deadline))
  }
}

struct UpcomingClassRecord: Record {
  @Field var courseName: String = ""
  @Field var location: String = ""
  /// Milliseconds since the epoch.
  @Field var start: Double = 0
  @Field var end: Double = 0

  var upcomingClass: UpcomingClass {
    UpcomingClass(courseName: courseName, location: location, start: Date(milliseconds: start), end: Date(milliseconds: end))
  }
}

/// Keeps the upcoming deadlines and classes for the "Next Deadline" and "Next Class" App Intents
/// (ios/learnX), which read them without starting React Native.
public final class ShortcutsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Shortcuts")

    Function("setUpcomingDeadlines", Self.setUpcomingDeadlines)
    Function("setUpcomingClasses", Self.setUpcomingClasses)
  }

  static func setUpcomingDeadlines(_ deadlines: [UpcomingDeadlineRecord]) {
    UpcomingDeadlines.save(deadlines.map(\.upcomingDeadline))
  }

  static func setUpcomingClasses(_ classes: [UpcomingClassRecord]) {
    UpcomingClasses.save(classes.map(\.upcomingClass))
  }
}

extension Date {
  init(milliseconds: Double) {
    self.init(timeIntervalSince1970: milliseconds / 1000)
  }
}
