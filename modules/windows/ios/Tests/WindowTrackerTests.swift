import Testing
import UIKit

@testable import LearnXWindows

@Suite(.serialized) struct WindowTrackerTests {
  private let link = URL(string: "learnx://notice/abc")!

  @Test func opensWithTheLinkItsActivityCarries() throws {
    let activity = WindowTracker.activity(opening: link)
    #expect(activity.activityType == WindowTracker.openActivityType)
    #expect(WindowTracker.url(of: activity) == link)
  }

  @Test func ignoresOtherActivities() {
    let activity = NSUserActivity(activityType: "com.apple.corespotlightitem")
    activity.userInfo = ["url": "learnx://notice/abc"]
    #expect(WindowTracker.url(of: activity) == nil)
    #expect(WindowTracker.initialURL(urls: [], activities: [activity]) == nil)
  }

  @Test func takesALinkBeforeAnActivity() {
    let other = URL(string: "learnx://assignment")!
    let activity = WindowTracker.activity(opening: link)
    #expect(WindowTracker.initialURL(urls: [other], activities: [activity]) == other)
    #expect(WindowTracker.initialURL(urls: [], activities: [activity]) == link)
    #expect(WindowTracker.initialURL(urls: [], activities: []) == nil)
  }

  @Test func restoresTheLinkAWindowLastShowed() throws {
    #expect(WindowTracker.restorationActivity(for: "window-a") == nil)
    WindowTracker.setLink("learnx://file", for: "window-a")
    WindowTracker.setLink("learnx://notice/abc", for: "window-a")
    let activity = try #require(WindowTracker.restorationActivity(for: "window-a"))
    #expect(WindowTracker.url(of: activity) == link)

    WindowTracker.forget(["window-a"])
    #expect(WindowTracker.restorationActivity(for: "window-a") == nil)
  }

  @Test func setLinkNilForgetsTheWindow() {
    WindowTracker.setLink("learnx://today", for: "window-b")
    WindowTracker.setLink(nil, for: "window-b")
    #expect(WindowTracker.link(for: "window-b") == nil)
  }

  @Test func targetsTheLastWindowSet() {
    WindowTracker.setTarget("window-a")
    WindowTracker.setTarget("window-b")
    #expect(WindowTracker.targetWindowId == "window-b")
  }

  @MainActor @Test func targetsTheWindowThatBecomesKey() throws {
    let scene = try #require(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    WindowTracker.setTarget("another-window")
    KeyWindowObserver.shared.start()
    let window = UIWindow(windowScene: scene)
    NotificationCenter.default.post(name: UIWindow.didBecomeKeyNotification, object: window)
    #expect(WindowTracker.targetWindowId == scene.session.persistentIdentifier)
  }

  @MainActor @Test func knowsWhetherTheAppCanShowSeveralWindows() {
    WindowTracker.start(.shared)
    #expect(WindowTracker.supportsMultipleWindows == UIApplication.shared.supportsMultipleScenes)
  }
}
