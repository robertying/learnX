import Testing
import UIKit

@testable import learnX

/// The app has launched, so `preferSoftTopEdgeEffect` has run.
@MainActor
@Suite struct ScrollEdgeEffectTests {
  private func window() throws -> UIWindow {
    let scene = try #require(
      UIApplication.shared.connectedScenes.first as? UIWindowScene
    )
    return UIWindow(windowScene: scene)
  }

  @Test func softensTheAutomaticTopEdgeInAWindow() throws {
    guard #available(iOS 26, *) else { return }
    let scrollView = UIScrollView()
    #expect(scrollView.topEdgeEffect.style == .automatic)

    let window = try window()
    window.addSubview(scrollView)
    #expect(scrollView.topEdgeEffect.style == .soft)
    #expect(scrollView.bottomEdgeEffect.style == .automatic)
  }

  @Test func keepsAStyleSetOnPurpose() throws {
    guard #available(iOS 26, *) else { return }
    let scrollView = UITableView()
    scrollView.topEdgeEffect.style = .hard

    let window = try window()
    window.addSubview(scrollView)
    #expect(scrollView.topEdgeEffect.style == .hard)
  }

  @Test func leavesOtherViewsAlone() throws {
    let view = UIView()
    let window = try window()
    window.addSubview(view)
    #expect(view.window == window)
  }
}
