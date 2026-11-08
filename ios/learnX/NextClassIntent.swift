import AppIntents
import Foundation
// ExpoModulesProvider imports it as `internal`, and Swift rejects mixed implicit levels.
internal import LearnXSpotlight

/// Says which class is on now and which one is next, and when and where, from the timetable the app last loaded, so
/// it answers right away and offline. The app saves this week's and next week's classes.
struct NextClassIntent: AppIntent {
  static let title: LocalizedStringResource = "Next Class"
  static let description = IntentDescription("Tells you when and where your next class is.")

  func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    let now = Date.now
    let classes = UpcomingClasses.load(at: now)
    let current = classes.first { $0.start <= now }
    let next = classes.first { $0.start > now }

    // In the language of the strings around them.
    let locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "en")
    let timeFormatter = DateFormatter()
    timeFormatter.locale = locale
    timeFormatter.dateStyle = .none
    timeFormatter.timeStyle = .short
    // "today at 1:30 PM", "tomorrow at 8:00 AM", or the date for later days.
    let dateFormatter = DateFormatter()
    dateFormatter.locale = locale
    dateFormatter.dateStyle = .medium
    dateFormatter.timeStyle = .short
    dateFormatter.doesRelativeDateFormatting = true
    dateFormatter.formattingContext = .middleOfSentence

    var sentences: [String] = []
    if let current {
      sentences.append(String(localized: "You're in \(current.courseName) until \(timeFormatter.string(from: current.end))."))
    }
    if let next {
      let when = dateFormatter.string(from: next.start)
      sentences.append(
        next.location.isEmpty
          ? String(localized: "Your next class is \(next.courseName), \(when).")
          : String(localized: "Your next class is \(next.courseName), \(when), in \(next.location).")
      )
    } else if current == nil {
      sentences.append(String(localized: "You have no classes this week or next."))
    }
    return answer(sentences.joined(separator: String(localized: "sentence separator", defaultValue: " ")))
  }

  /// Says the sentence the app localized, as `NextDeadlineIntent` does, so it isn't in two languages.
  private func answer(_ text: String) -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    .result(value: text, dialog: IntentDialog(stringLiteral: text))
  }
}
