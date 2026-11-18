import Foundation
import Testing

@testable import LearnXWindows

struct WindowFrameAutosaveTests {
  private let defaults = UserDefaults(suiteName: "WindowFrameAutosaveTests")!
  private let screen = CGSize(width: 1512, height: 982)

  init() {
    defaults.removePersistentDomain(forName: "WindowFrameAutosaveTests")
  }

  @Test func savesAFrameAndReadsItBack() {
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == nil)
    let frame = CGRect(x: 120, y: 80, width: 1100, height: 720)
    WindowFrameAutosave.save(frame, screen: screen, in: defaults)
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == frame)
  }

  @Test func keepsTheLastFrameOverFullScreenOrAnEmptyOne() {
    let frame = CGRect(x: 120, y: 80, width: 1100, height: 720)
    WindowFrameAutosave.save(frame, screen: screen, in: defaults)
    WindowFrameAutosave.save(CGRect(origin: .zero, size: screen), screen: screen, in: defaults)
    WindowFrameAutosave.save(.zero, screen: screen, in: defaults)
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == frame)
  }

  @Test func ignoresAnUnusableValue() {
    defaults.set("not a rect", forKey: WindowFrameAutosave.key)
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == nil)
  }
}
