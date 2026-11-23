import Foundation
import Testing
import UIKit

@testable import LearnXMenuBar

/// The plugin's side, recorded.
@MainActor
private final class FakeHost: NSObject, MenuBarHosting {
  var launchedAsLoginItem = false
  var showsInDock: [Bool] = []
  var activations = 0
  var titles: [String] = []
  var onOpen: (() -> Void)?
  var onCheck: (() -> Void)?

  func showStatusItem(
    openTitle: String,
    checkTitle: String,
    quitTitle: String,
    onOpen: @escaping () -> Void,
    onCheck: @escaping () -> Void
  ) {
    titles = [openTitle, checkTitle, quitTitle]
    self.onOpen = onOpen
    self.onCheck = onCheck
  }

  func setShowsInDock(_ shows: Bool) {
    showsInDock.append(shows)
  }

  func activate() {
    activations += 1
  }
}

/// Windows that open when asked, recorded.
@MainActor
private final class FakeWindows: AppWindows {
  var hasOpenWindow = false
  /// Whether each request opened a new window (true) or brought the open one to the front.
  var shown: [Bool] = []

  func showWindow() -> Bool {
    shown.append(!hasOpenWindow)
    return !hasOpenWindow
  }
}

/// Each test starts the menu bar with a notification center of its own; serialized, as `MenuBar` is one per app.
@MainActor
@Suite(.serialized) struct MenuBarTests {
  private let center = NotificationCenter()
  private let host = FakeHost()
  private let windows = FakeWindows()

  private func start(loginItem: Bool = false) {
    MenuBar.reset()
    host.launchedAsLoginItem = loginItem
    MenuBar.start(host: host, windows: windows, center: center)
  }

  private func comeToFront() {
    center.post(name: MenuBar.didBecomeActive, object: nil)
  }

  @Test func doesNothingWithoutThePlugin() {
    MenuBar.reset()
    MenuBar.start(host: nil, windows: windows, center: center)
    #expect(MenuBar.windowWillConnect())
    MenuBar.windowDidDisconnect(remainingWindows: 0)
    comeToFront()
    #expect(windows.shown.isEmpty)
  }

  @Test func showsLearnXInTheDockWhileAWindowIsOpen() {
    start()
    #expect(host.showsInDock.isEmpty)
    #expect(MenuBar.windowWillConnect())
    MenuBar.windowDidDisconnect(remainingWindows: 1)
    #expect(host.showsInDock == [true])
    MenuBar.windowDidDisconnect(remainingWindows: 0)
    #expect(host.showsInDock == [true, false])
  }

  @Test func opensNoWindowAsALoginItemUntilOneIsAskedFor() {
    start(loginItem: true)
    #expect(MenuBar.opensHidden)
    #expect(host.showsInDock == [false])
    // The windows it would restore.
    #expect(!MenuBar.windowWillConnect())
    #expect(!MenuBar.windowWillConnect())

    MenuBar.open()
    #expect(!MenuBar.opensHidden)
    #expect(host.showsInDock == [false, true])
    #expect(host.activations == 1)
    #expect(windows.shown == [true])
    #expect(MenuBar.windowWillConnect())
  }

  @Test func opensAWindowWhenBroughtToTheFrontWithoutOne() {
    start()
    comeToFront()
    #expect(windows.shown == [true])
    // Coming to the front for that window asks for no other.
    comeToFront()
    #expect(windows.shown == [true])
    #expect(MenuBar.windowWillConnect())

    // With a window open, it's up to UIKit.
    windows.hasOpenWindow = true
    comeToFront()
    #expect(windows.shown == [true])
  }

  @Test func opensAWindowWhenBroughtToTheFrontAfterALoginLaunch() {
    start(loginItem: true)
    // A window from a notification tap opened first.
    windows.hasOpenWindow = true
    comeToFront()
    #expect(!MenuBar.opensHidden)
    #expect(windows.shown == [false])
  }

  @Test func bringsTheOpenWindowToTheFrontFromTheMenu() {
    start()
    MenuBar.showItem(openTitle: "Open learnX", checkTitle: "Check for New Content", quitTitle: "Quit learnX")
    #expect(host.titles == ["Open learnX", "Check for New Content", "Quit learnX"])
    windows.hasOpenWindow = true
    host.onOpen?()
    #expect(windows.shown == [false])
    #expect(host.activations == 1)
    // Not waiting for a new window: coming to the front with one open asks for nothing.
    comeToFront()
    #expect(windows.shown == [false])
  }

  @Test func postsCheckForNewContent() async {
    start()
    MenuBar.showItem(openTitle: "", checkTitle: "", quitTitle: "")
    await confirmation { checked in
      let observer = NotificationCenter.default.addObserver(
        forName: MenuBar.checkForNewContent,
        object: nil,
        queue: nil
      ) { _ in checked() }
      host.onCheck?()
      NotificationCenter.default.removeObserver(observer)
    }
  }

  @Test func stopsListeningOnceReset() {
    start()
    MenuBar.reset(center: center)
    comeToFront()
    #expect(windows.shown.isEmpty)
  }
}
