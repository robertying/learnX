import Foundation
import Testing

@testable import LearnXWindows

@Suite struct AppActivationTests {
  @Test func readsAppKitsActivationNotifications() {
    #expect(AppActivation.isActive(after: Notification.Name("NSApplicationDidBecomeActiveNotification")) == true)
    #expect(AppActivation.isActive(after: Notification.Name("NSApplicationDidResignActiveNotification")) == false)
    #expect(AppActivation.isActive(after: Notification.Name("UIApplicationDidBecomeActiveNotification")) == nil)
  }

}
