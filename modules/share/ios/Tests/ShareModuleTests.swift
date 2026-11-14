import ExpoModulesCore
import Testing
import UIKit

@testable import LearnXShare

/// The module as JS calls it. The test host has no app group, so it never finds a shared file there.
@MainActor
@Suite(.serialized) struct ShareModuleTests {
  @Test func definesItsFunctions() {
    _ = ShareModule(appContext: AppContext()).definition()
  }

  @Test func findsNoInboxWithoutTheAppGroup() {
    #expect(ShareModule.inbox == nil)
    #expect(ShareModule.takeSharedItem() == nil)
    #expect(ShareModule.getSharedFilesDirectory() == nil)
  }

  @Test func listensForSharedLinksWhileJSDoes() {
    let module = ShareModule(appContext: AppContext())
    module.startObserving()
    // Nothing waits in the inbox, so nothing is sent.
    NotificationCenter.default.post(name: ShareAppDelegateSubscriber.notification, object: nil)
    module.stopObserving()
    // Stopping twice is fine.
    module.stopObserving()
  }

  @Test func refusesToSaveWithNoWindowToAskIn() async throws {
    // The test host's window belongs to no scene, so there is no key window to present the save panel from.
    #expect(ShareModule.presenter() == nil)
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("save-test.txt")
    await #expect(throws: NoWindowError.self) {
      try await ShareModule.saveFile(url)
    }
  }

  @Test func saysWhyItCannotAsk() {
    #expect(NoWindowError().errorDescription == "No window to ask where to save in")
  }

  @Test(arguments: [("learnx://", true), ("learnx://assignment/1", true), ("https://learn.tsinghua.edu.cn", false)])
  func postsForLearnXLinks(link: String, posts: Bool) throws {
    let posted = Flag()
    let observer = NotificationCenter.default.addObserver(
      forName: ShareAppDelegateSubscriber.notification,
      object: nil,
      queue: nil
    ) { _ in posted.value = true }
    defer { NotificationCenter.default.removeObserver(observer) }

    let handled = ShareAppDelegateSubscriber().application(UIApplication.shared, open: try #require(URL(string: link)))

    // Never claims the link: React Native's Linking handles it.
    #expect(!handled)
    #expect(posted.value == posts)
  }
}

final class Flag: @unchecked Sendable {
  var value = false
}
