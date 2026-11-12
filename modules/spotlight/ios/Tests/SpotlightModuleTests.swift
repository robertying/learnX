import CoreSpotlight
import ExpoModulesCore
import Testing

@testable import LearnXSpotlight

/// The module's functions, as JS calls them. They use the shared taps, the app's user defaults and the device's
/// index, so they run one at a time.
@MainActor
@Suite(.serialized) struct SpotlightModuleTests {
  let module = SpotlightModule(appContext: AppContext())

  @Test func definesItsFunctions() {
    _ = module.definition()
  }

  @Test func handsTheTappedItemToJS() {
    SpotlightTaps.shared.open(SpotlightIdentifier(domain: "notice", id: "1"))
    #expect(SpotlightModule.takeOpenedItem() == ["domain": "notice", "id": "1"])
    #expect(SpotlightModule.takeOpenedItem() == nil)
  }

  @Test func sendsTapsWhileJSListens() {
    module.startObserving()
    SpotlightTaps.shared.open(SpotlightIdentifier(domain: "notice", id: "2"))
    // Sent as an event (with no JS runtime here, dropped), not kept.
    #expect(SpotlightModule.takeOpenedItem() == nil)

    SpotlightModule.stopObserving()
    SpotlightTaps.shared.open(SpotlightIdentifier(domain: "notice", id: "3"))
    #expect(SpotlightModule.takeOpenedItem()?["id"] == "3")
  }

  @Test func indexesInTheDevicesIndex() async throws {
    try await SpotlightModule.syncItems(domain: "learnx-tests", items: [spotlightItem(id: "1")])
    try await SpotlightModule.syncItems(domain: "learnx-tests", items: [spotlightItem(id: "2")])
    try await SpotlightModule.removeAllItems()
    #expect(IndexedItems.standard?.load(domain: "learnx-tests") == nil)
  }

  @Test func savesTheUpcomingDeadlines() {
    var record = UpcomingDeadlineRecord()
    record.id = "1"
    record.deadline = Date.distantFuture.timeIntervalSince1970 * 1000
    SpotlightModule.setUpcomingDeadlines([record])
    #expect(UpcomingDeadlines.load().map(\.id) == ["1"])

    SpotlightModule.setUpcomingDeadlines([])
    #expect(UpcomingDeadlines.load().isEmpty)
  }

  @Test func savesTheUpcomingClasses() {
    var record = UpcomingClassRecord()
    record.courseName = "Physics"
    record.end = Date.distantFuture.timeIntervalSince1970 * 1000
    SpotlightModule.setUpcomingClasses([record])
    #expect(UpcomingClasses.load().map(\.courseName) == ["Physics"])

    SpotlightModule.setUpcomingClasses([])
    #expect(UpcomingClasses.load().isEmpty)
  }
}
