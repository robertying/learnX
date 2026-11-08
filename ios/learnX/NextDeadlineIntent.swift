import AppIntents
import Foundation
// ExpoModulesProvider imports it as `internal`, and Swift rejects mixed implicit levels.
internal import LearnXSpotlight

/// Says which open assignment is due next, from what the app last loaded, so it answers right away and offline.
struct NextDeadlineIntent: AppIntent {
  static let title: LocalizedStringResource = "Next Deadline"
  static let description = IntentDescription("Tells you which assignment is due next.")

  func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    guard let next = UpcomingDeadlines.load().first else {
      return answer(String(localized: "You have no upcoming deadlines."))
    }
    let formatter = RelativeDateTimeFormatter()
    // In the language of the strings around it.
    formatter.locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "en")
    formatter.unitsStyle = .full
    let due = formatter.localizedString(from: Self.timeUntil(next.deadline))
    return answer(String(localized: "\(next.title) for \(next.courseName) is due \(due)."))
  }

  /// The time until `date`, rounded as the app's lists round it (dayjs's `relativeTime` with its default
  /// thresholds), so both say "in 6 days" where `RelativeDateTimeFormatter` alone would truncate to 5.
  private static func timeUntil(_ date: Date) -> DateComponents {
    let seconds = max(date.timeIntervalSinceNow, 0)
    let minutes = (seconds / 60).rounded()
    let hours = (seconds / 3600).rounded()
    let days = (seconds / 86400).rounded()
    let months = (seconds / 86400 / 30.4375).rounded()
    let years = (seconds / 86400 / 365.25).rounded()
    let rules: [(Bool, DateComponents)] = [
      (seconds.rounded() <= 44, DateComponents(second: Int(seconds.rounded()))),
      (seconds.rounded() <= 89, DateComponents(minute: 1)),
      (minutes <= 44, DateComponents(minute: Int(minutes))),
      (minutes <= 89, DateComponents(hour: 1)),
      (hours <= 21, DateComponents(hour: Int(hours))),
      (hours <= 35, DateComponents(day: 1)),
      (days <= 25, DateComponents(day: Int(days))),
      (days <= 45, DateComponents(month: 1)),
      (months <= 10, DateComponents(month: Int(months))),
      (months <= 17, DateComponents(year: 1)),
    ]
    return rules.first { $0.0 }?.1 ?? DateComponents(year: Int(years))
  }

  /// Says the sentence the app localized. A dialog built from a `LocalizedStringResource` is translated by Shortcuts
  /// or Siri in the system language, so with a different language set for learnX the sentence and the relative time
  /// inside it would be in two languages.
  private func answer(_ text: String) -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    .result(value: text, dialog: IntentDialog(stringLiteral: text))
  }
}

struct LearnXShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: NextDeadlineIntent(),
      phrases: [
        "What's my next deadline in \(.applicationName)",
        "Next deadline in \(.applicationName)",
        "\(.applicationName) next deadline",
      ],
      shortTitle: "Next Deadline",
      systemImageName: "calendar.badge.clock"
    )
  }
}
