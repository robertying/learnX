import CoreSpotlight
import ExpoModulesCore
import Testing

@testable import LearnXSpotlight

/// The module's functions, as JS calls them. They use the shared taps and the device's index, so they run one at a
/// time.
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
    try await SpotlightModule.replaceItems(domain: "learnx-tests", items: [spotlightItem(id: "1")], state: "a1")
    #expect(try await SpotlightModule.indexState() == "a1")
    try await SpotlightModule.updateItems(
      domain: "learnx-tests",
      items: [spotlightItem(id: "2")],
      removedIds: ["1"],
      state: "b2"
    )
    #expect(try await SpotlightModule.indexState() == "b2")
    try await SpotlightModule.removeAllItems(state: "c3")
    #expect(try await SpotlightModule.indexState() == "c3")
  }
}
