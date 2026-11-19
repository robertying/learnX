import Foundation
import Testing

@testable import LearnXWindows

/// A user defaults suite of the test's own, emptied first: Swift Testing runs a suite's tests in parallel, so a
/// shared one would let one test's reset or write land between another's write and read.
private func testDefaults(_ name: String = #function) -> UserDefaults {
  let suite = "io.robertying.learnx.tests.windows.\(name)"
  UserDefaults().removePersistentDomain(forName: suite)
  return UserDefaults(suiteName: suite)!
}

struct WindowFrameAutosaveTests {
  private let screen = CGSize(width: 1512, height: 982)

  @Test func savesAFrameAndReadsItBack() {
    let defaults = testDefaults()
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == nil)
    let frame = CGRect(x: 120, y: 80, width: 1100, height: 720)
    WindowFrameAutosave.save(frame, screen: screen, in: defaults)
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == frame)
  }

  @Test func keepsTheLastFrameOverFullScreenOrAnEmptyOne() {
    let defaults = testDefaults()
    let frame = CGRect(x: 120, y: 80, width: 1100, height: 720)
    WindowFrameAutosave.save(frame, screen: screen, in: defaults)
    WindowFrameAutosave.save(CGRect(origin: .zero, size: screen), screen: screen, in: defaults)
    WindowFrameAutosave.save(.zero, screen: screen, in: defaults)
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == frame)
  }

  @Test func ignoresAnUnusableValue() {
    let defaults = testDefaults()
    defaults.set("not a rect", forKey: WindowFrameAutosave.key)
    #expect(WindowFrameAutosave.savedFrame(in: defaults) == nil)
  }
}
