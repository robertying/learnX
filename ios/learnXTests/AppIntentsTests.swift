import AppIntents
import Foundation
import LearnXSpotlight
import Testing

@testable import learnX

/// Decoded as the app saves them: `Codable` is their public API.
func upcomingDeadline(title: String, courseName: String, deadline: Date) throws -> UpcomingDeadline {
  let json: [String: Any] = [
    "id": "1", "title": title, "courseName": courseName, "deadline": deadline.timeIntervalSinceReferenceDate,
  ]
  return try JSONDecoder().decode(UpcomingDeadline.self, from: JSONSerialization.data(withJSONObject: json))
}

func upcomingClass(_ courseName: String, location: String = "", start: Date, end: Date) throws -> UpcomingClass {
  let json: [String: Any] = [
    "courseName": courseName, "location": location,
    "start": start.timeIntervalSinceReferenceDate, "end": end.timeIntervalSinceReferenceDate,
  ]
  return try JSONDecoder().decode(UpcomingClass.self, from: JSONSerialization.data(withJSONObject: json))
}

/// Answers are in the app's language, whichever the simulator uses, so they're compared with the app's own strings.
@Suite struct NextDeadlineIntentTests {
  let now = Date(timeIntervalSince1970: 1_700_000_000)

  @Test(arguments: [
    (0.0, DateComponents(second: 0)),
    (-30.0, DateComponents(second: 0)),
    (44.0, DateComponents(second: 44)),
    (60.0, DateComponents(minute: 1)),
    (44 * 60.0, DateComponents(minute: 44)),
    (60 * 60.0, DateComponents(hour: 1)),
    (21 * 3600.0, DateComponents(hour: 21)),
    (30 * 3600.0, DateComponents(day: 1)),
    // dayjs rounds 5.6 days to 6; RelativeDateTimeFormatter alone would say 5.
    (5.6 * 86400, DateComponents(day: 6)),
    (40 * 86400.0, DateComponents(month: 1)),
    (200 * 86400.0, DateComponents(month: 7)),
    (400 * 86400.0, DateComponents(year: 1)),
    (800 * 86400.0, DateComponents(year: 2)),
  ])
  func roundsAsTheAppDoes(seconds: Double, expected: DateComponents) {
    #expect(NextDeadlineIntent.timeUntil(now + seconds, from: now) == expected)
  }

  @Test func saysWhenNothingIsDue() {
    #expect(NextDeadlineIntent.sentence(for: nil, now: now) == String(localized: "You have no upcoming deadlines."))
  }

  @Test func saysWhatIsDueNext() throws {
    let next = try upcomingDeadline(title: "Homework 3", courseName: "Calculus", deadline: now + 5.6 * 86400)
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = NextDeadlineIntent.answerLocale
    formatter.unitsStyle = .full
    let due = formatter.localizedString(from: DateComponents(day: 6))

    #expect(
      NextDeadlineIntent.sentence(for: next, now: now)
        == String(localized: "\("Homework 3") for \("Calculus") is due \(due).")
    )
  }
}

@Suite struct NextClassIntentTests {
  let now = Date(timeIntervalSince1970: 1_700_000_000)

  @Test func saysWhenThereAreNoClasses() {
    #expect(NextClassIntent.sentence(for: [], now: now) == String(localized: "You have no classes this week or next."))
  }

  @Test func saysTheClassGoingOnAndTheNextOne() throws {
    let sentence = NextClassIntent.sentence(
      for: [
        try upcomingClass("Physics", start: now - 600, end: now + 1200),
        try upcomingClass("Calculus", location: "6A017", start: now + 3600, end: now + 7200),
      ],
      now: now
    )
    #expect(sentence.contains("Physics"))
    #expect(sentence.contains("Calculus"))
    #expect(sentence.contains("6A017"))
  }

  @Test func leavesOutAMissingLocation() throws {
    let sentence = NextClassIntent.sentence(
      for: [try upcomingClass("Calculus", start: now + 3600, end: now + 7200)],
      now: now
    )
    #expect(sentence.contains("Calculus"))
    #expect(!sentence.contains(String(localized: "You have no classes this week or next.")))
  }

  @Test func saysOnlyTheClassGoingOnWhenItIsTheLast() throws {
    let sentence = NextClassIntent.sentence(
      for: [try upcomingClass("Physics", start: now - 600, end: now + 1200)],
      now: now
    )
    #expect(sentence.contains("Physics"))
    #expect(!sentence.contains(String(localized: "You have no classes this week or next.")))
  }
}

/// `perform()` reads what the app saved in its own user defaults; the tests put back what was there.
@Suite(.serialized) struct AppIntentPerformTests {
  private func withSaved(_ key: String, _ value: Any?, _ body: () async throws -> Void) async rethrows {
    let defaults = UserDefaults.standard
    let saved = defaults.object(forKey: key)
    defer { defaults.set(saved, forKey: key) }
    defaults.set(value, forKey: key)
    try await body()
  }

  @Test func answersTheNextDeadline() async throws {
    let deadline = try JSONEncoder().encode([
      try upcomingDeadline(title: "Homework", courseName: "Calculus", deadline: .now + 3600)
    ])
    try await withSaved("LearnXUpcomingDeadlines", deadline) {
      _ = try await NextDeadlineIntent().perform()
    }
    try await withSaved("LearnXUpcomingDeadlines", nil) {
      _ = try await NextDeadlineIntent().perform()
    }
  }

  @Test func answersTheNextClass() async throws {
    try await withSaved("LearnXUpcomingClasses", nil) {
      _ = try await NextClassIntent().perform()
    }
  }

  @Test func offersBothShortcuts() {
    #expect(LearnXShortcuts.appShortcuts.count == 2)
  }
}
