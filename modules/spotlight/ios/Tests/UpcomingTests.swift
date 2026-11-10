import Foundation
import Testing

@testable import LearnXSpotlight

/// A user defaults suite of its own, emptied first.
func testDefaults(_ name: String = #function) -> UserDefaults {
  let suite = "io.robertying.learnx.tests.\(name)"
  UserDefaults().removePersistentDomain(forName: suite)
  return UserDefaults(suiteName: suite)!
}

@Suite struct UpcomingDeadlinesTests {
  let now = Date(timeIntervalSince1970: 1_700_000_000)

  @Test func savesAndLoadsTheDeadlinesAhead() {
    let defaults = testDefaults()
    UpcomingDeadlines.save(
      [
        UpcomingDeadline(id: "late", title: "B", courseName: "Physics", deadline: now + 7200),
        UpcomingDeadline(id: "past", title: "C", courseName: "Physics", deadline: now - 1),
        UpcomingDeadline(id: "soon", title: "A", courseName: "Calculus", deadline: now + 3600),
      ],
      to: defaults
    )

    let deadlines = UpcomingDeadlines.load(after: now, from: defaults)

    #expect(deadlines.map(\.id) == ["soon", "late"])
    #expect(deadlines.first?.title == "A")
    #expect(deadlines.first?.courseName == "Calculus")
  }

  @Test func savingNothingClears() {
    let defaults = testDefaults()
    UpcomingDeadlines.save([UpcomingDeadline(id: "1", title: "A", courseName: "B", deadline: now + 1)], to: defaults)
    UpcomingDeadlines.save([], to: defaults)
    #expect(defaults.object(forKey: UpcomingDeadlines.key) == nil)
    #expect(UpcomingDeadlines.load(after: now, from: defaults).isEmpty)
  }

  @Test func ignoresUnreadableData() {
    let defaults = testDefaults()
    defaults.set(Data("not json".utf8), forKey: UpcomingDeadlines.key)
    #expect(UpcomingDeadlines.load(after: now, from: defaults).isEmpty)
  }

  @Test func usesTheStandardDefaults() {
    // The App Intent reads the app's own defaults.
    #expect(UpcomingDeadlines.load(after: .distantFuture).isEmpty)
  }
}

@Suite struct UpcomingClassesTests {
  let now = Date(timeIntervalSince1970: 1_700_000_000)

  @Test func savesAndLoadsTheClassesNotOver() {
    let defaults = testDefaults()
    UpcomingClasses.save(
      [
        UpcomingClass(courseName: "Next", location: "6A017", start: now + 3600, end: now + 7200),
        UpcomingClass(courseName: "Over", location: "", start: now - 7200, end: now - 1),
        UpcomingClass(courseName: "Now", location: "", start: now - 600, end: now + 600),
      ],
      to: defaults
    )

    let classes = UpcomingClasses.load(at: now, from: defaults)

    #expect(classes.map(\.courseName) == ["Now", "Next"])
    #expect(classes.last?.location == "6A017")
  }

  @Test func savingNothingClears() {
    let defaults = testDefaults()
    UpcomingClasses.save([UpcomingClass(courseName: "A", location: "", start: now, end: now + 1)], to: defaults)
    UpcomingClasses.save([], to: defaults)
    #expect(defaults.object(forKey: UpcomingClasses.key) == nil)
  }

  @Test func ignoresUnreadableData() {
    let defaults = testDefaults()
    defaults.set(Data("not json".utf8), forKey: UpcomingClasses.key)
    #expect(UpcomingClasses.load(at: now, from: defaults).isEmpty)
  }

  @Test func usesTheStandardDefaults() {
    #expect(UpcomingClasses.load(at: .distantFuture).isEmpty)
  }
}

@Suite struct RecordTests {
  @Test func convertsADeadlineRecord() {
    var record = UpcomingDeadlineRecord()
    record.id = "1"
    record.title = "Homework"
    record.courseName = "Calculus"
    record.deadline = 1_700_000_000_000

    let deadline = record.upcomingDeadline

    #expect(deadline.id == "1")
    #expect(deadline.title == "Homework")
    #expect(deadline.courseName == "Calculus")
    #expect(deadline.deadline == Date(timeIntervalSince1970: 1_700_000_000))
  }

  @Test func convertsAClassRecord() {
    var record = UpcomingClassRecord()
    record.courseName = "Physics"
    record.location = "6A017"
    record.start = 1_700_000_000_000
    record.end = 1_700_003_600_000

    let upcoming = record.upcomingClass

    #expect(upcoming.courseName == "Physics")
    #expect(upcoming.location == "6A017")
    #expect(upcoming.start == Date(timeIntervalSince1970: 1_700_000_000))
    #expect(upcoming.end == Date(timeIntervalSince1970: 1_700_003_600))
  }

  @Test func convertsMilliseconds() {
    #expect(Date(milliseconds: 1500) == Date(timeIntervalSince1970: 1.5))
  }
}
