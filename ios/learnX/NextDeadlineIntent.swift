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
      return .result(
        value: String(localized: "You have no upcoming deadlines."),
        dialog: "You have no upcoming deadlines."
      )
    }
    let formatter = RelativeDateTimeFormatter()
    // In the language of the strings around it.
    formatter.locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "en")
    formatter.unitsStyle = .full
    let due = formatter.localizedString(for: next.deadline, relativeTo: .now)
    return .result(
      value: String(localized: "\(next.title) for \(next.courseName) is due \(due)."),
      dialog: "\(next.title) for \(next.courseName) is due \(due)."
    )
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
