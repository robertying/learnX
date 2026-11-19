import Foundation
import React
import Testing

/// What patches/react-native@0.88.1.patch changes in `RCTAppState`: AppKit's notifications that the app was left and
/// came back are app state changes. A Mac Catalyst app stays active in UIKit when another app comes to the front, so
/// without them `AppState` never said the app was back, and what it rechecks then (the notification permission and
/// calendar access after a visit to System Settings) stayed stale.
@MainActor
@Suite struct AppStatePatchTests {
  private final class Recorder: RCTAppState {
    var states: [String] = []

    override func sendEvent(withName eventName: String, body: Any?) {
      if eventName == "appStateDidChange", let state = (body as? [String: Any])?["app_state"] as? String {
        states.append(state)
      }
    }
  }

  @Test func reportsLeavingAndComingBackOnTheMac() {
    let appState = Recorder()
    appState.startObserving()
    defer { appState.stopObserving() }

    let center = NotificationCenter.default
    center.post(name: Notification.Name("NSApplicationDidResignActiveNotification"), object: nil)
    center.post(name: Notification.Name("NSApplicationDidBecomeActiveNotification"), object: nil)
    #expect(appState.states == ["inactive", "active"])
  }
}
