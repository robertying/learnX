import EventKit
internal import ExpoModulesCore
import Foundation
import Testing

@testable internal import ExpoCalendar

/// What patches/expo-calendar@58.0.6.patch changes on iOS: a reminder's due date keeps its time zone, so it stays
/// the same instant on devices in other time zones.
@MainActor
@Suite struct ExpoCalendarPatchTests {
  // 2026-11-20 23:59 in Beijing, 15:59 UTC.
  private let deadline = Date(timeIntervalSince1970: 1_795_708_740)
  private let beijing = TimeZone(identifier: "Asia/Shanghai")!

  @Test func dateComponentsCarryTheTimeZone() {
    let components = createDateComponents(for: deadline, timeZone: beijing)
    #expect(components.timeZone == beijing)
    #expect(components.hour == 23)
    #expect(components.minute == 59)
    #expect(Calendar.current.date(from: components) == deadline)
  }

  @Test func allDayComponentsHaveNoTimeZone() {
    let components = createDateComponents(for: deadline, allDay: true, timeZone: beijing)
    #expect(components.timeZone == nil)
    #expect(components.hour == nil)
  }

  @Test func reminderDueDateKeepsTheRemindersTimeZone() throws {
    let record = try Reminder(
      from: ["dueDate": deadline.timeIntervalSince1970 * 1000, "timeZone": beijing.identifier],
      appContext: AppContext()
    )
    let reminder = ExpoCalendarReminder(reminder: EKReminder(eventStore: EKEventStore()))
    try reminder.initialize(reminderRecord: record)

    let due = try #require(reminder.reminder?.dueDateComponents)
    #expect(due.timeZone == beijing)
    #expect(due.hour == 23)
  }
}
