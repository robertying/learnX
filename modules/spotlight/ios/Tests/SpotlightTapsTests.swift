import CoreSpotlight
import Testing
import UIKit

@testable import LearnXSpotlight

@Suite struct SpotlightIdentifierTests {
  @Test func joinsDomainAndId() {
    let identifier = SpotlightIdentifier(domain: "notice", id: "a:b")
    #expect(identifier.rawValue == "notice:a:b")
    #expect(identifier.payload == ["domain": "notice", "id": "a:b"])
  }

  @Test func splitsAtTheFirstColon() throws {
    let identifier = try #require(SpotlightIdentifier(rawValue: "assignment:12:3"))
    #expect(identifier.domain == "assignment")
    #expect(identifier.id == "12:3")
  }

  @Test func rejectsAnIdentifierWithoutADomain() {
    #expect(SpotlightIdentifier(rawValue: "12") == nil)
  }
}

@Suite struct SpotlightTapsTests {
  @Test func keepsATapUntilTaken() throws {
    let taps = SpotlightTaps()
    taps.open(SpotlightIdentifier(domain: "notice", id: "1"))
    taps.open(SpotlightIdentifier(domain: "notice", id: "2"))

    let pending = try #require(taps.takePending())
    #expect(pending.payload == ["domain": "notice", "id": "2"])
    #expect(taps.takePending() == nil)
  }

  @Test func passesTapsToTheListener() {
    let taps = SpotlightTaps()
    var received: [[String: String]] = []
    taps.setListener { received.append($0.payload) }
    taps.open(SpotlightIdentifier(domain: "assignment", id: "7"))

    #expect(received == [["domain": "assignment", "id": "7"]])
    #expect(taps.takePending() == nil)

    taps.setListener(nil)
    taps.open(SpotlightIdentifier(domain: "assignment", id: "8"))
    #expect(received.count == 1)
    #expect(taps.takePending()?.id == "8")
  }
}

@MainActor
@Suite struct SpotlightAppDelegateSubscriberTests {
  private func continueActivity(_ activity: NSUserActivity, taps: SpotlightTaps) -> (handled: Bool, restored: Bool) {
    let subscriber = SpotlightAppDelegateSubscriber()
    subscriber.taps = taps
    var restored = false
    let handled = subscriber.application(UIApplication.shared, continue: activity) { _ in restored = true }
    return (handled, restored)
  }

  @Test func opensATappedResult() {
    let activity = NSUserActivity(activityType: CSSearchableItemActionType)
    activity.userInfo = [CSSearchableItemActivityIdentifier: "notice:5"]
    let taps = SpotlightTaps()

    let result = continueActivity(activity, taps: taps)

    #expect(result.handled)
    #expect(result.restored)
    #expect(taps.takePending()?.payload == ["domain": "notice", "id": "5"])
  }

  @Test(arguments: [
    (CSSearchableItemActionType, nil as String?),
    (CSSearchableItemActionType, "no-domain"),
    ("io.robertying.learnx.other", "notice:5"),
  ])
  func ignoresOtherActivities(type: String, identifier: String?) {
    let activity = NSUserActivity(activityType: type)
    if let identifier {
      activity.userInfo = [CSSearchableItemActivityIdentifier: identifier]
    }
    let taps = SpotlightTaps()

    let result = continueActivity(activity, taps: taps)

    #expect(!result.handled)
    #expect(!result.restored)
    #expect(taps.takePending() == nil)
  }
}
