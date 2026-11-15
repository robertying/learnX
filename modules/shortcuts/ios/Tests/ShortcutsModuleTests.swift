import ExpoModulesCore
import Testing

@testable import LearnXShortcuts

/// The module's functions, as JS calls them. They write the app's user defaults, so they run one at a time.
@MainActor
@Suite(.serialized) struct ShortcutsModuleTests {
  let module = ShortcutsModule(appContext: AppContext())

  @Test func definesItsFunctions() {
    _ = module.definition()
  }

  @Test func savesTheUpcomingDeadlines() {
    var record = UpcomingDeadlineRecord()
    record.id = "1"
    record.deadline = Date.distantFuture.timeIntervalSince1970 * 1000
    ShortcutsModule.setUpcomingDeadlines([record])
    #expect(UpcomingDeadlines.load().map(\.id) == ["1"])

    ShortcutsModule.setUpcomingDeadlines([])
    #expect(UpcomingDeadlines.load().isEmpty)
  }

  @Test func savesTheUpcomingClasses() {
    var record = UpcomingClassRecord()
    record.courseName = "Physics"
    record.end = Date.distantFuture.timeIntervalSince1970 * 1000
    ShortcutsModule.setUpcomingClasses([record])
    #expect(UpcomingClasses.load().map(\.courseName) == ["Physics"])

    ShortcutsModule.setUpcomingClasses([])
    #expect(UpcomingClasses.load().isEmpty)
  }
}
