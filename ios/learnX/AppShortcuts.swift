import AppIntents
import Foundation

/// Every App Shortcut learnX offers to Siri, Spotlight and Shortcuts. Their Chinese phrases are in
/// `zh-Hans.lproj/AppShortcuts.strings`.
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
    AppShortcut(
      intent: NextClassIntent(),
      phrases: [
        "What's my next class in \(.applicationName)",
        "Next class in \(.applicationName)",
        "\(.applicationName) next class",
      ],
      shortTitle: "Next Class",
      systemImageName: "studentdesk"
    )
  }
}

extension AppIntent {
  /// The language learnX's strings are in, for formatters whose output goes inside them.
  static var answerLocale: Locale {
    Locale(identifier: Bundle.main.preferredLocalizations.first ?? "en")
  }

  /// Says a sentence the app localized. A dialog built from a `LocalizedStringResource` is translated by Shortcuts
  /// or Siri in the system language, so with a different language set for learnX the sentence and the times
  /// formatted inside it would be in two languages.
  func answer(_ text: String) -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    .result(value: text, dialog: IntentDialog(stringLiteral: text))
  }
}
