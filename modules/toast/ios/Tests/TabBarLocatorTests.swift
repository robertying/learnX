import Testing
import UIKit

@testable import LearnXToast

@MainActor
@Suite struct TabBarLocatorTests {
  /// A shown iPhone-sized window around `root`, laid out. Compact width, so the tab bar sits along the bottom on an
  /// iPad simulator too, where a regular width floats it at the top and hides the bar itself.
  private func window(_ root: UIViewController) -> UIWindow {
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 402, height: 874))
    window.traitOverrides.horizontalSizeClass = .compact
    window.rootViewController = root
    window.isHidden = false
    window.layoutIfNeeded()
    return window
  }

  private func tabs() -> UITabBarController {
    let tabs = UITabBarController()
    tabs.viewControllers = [UIViewController()]
    return tabs
  }

  @Test func findsTheTabBarInsideAnotherController() throws {
    let container = UIViewController()
    let tabs = tabs()
    container.addChild(tabs)
    container.view.addSubview(tabs.view)
    tabs.view.frame = container.view.bounds
    tabs.didMove(toParent: container)
    let window = window(container)

    let frame = try #require(TabBarLocator.frame(in: window))
    let bar = tabs.tabBar.convert(tabs.tabBar.bounds, to: window)
    #expect(
      frame == [
        "x": Double(bar.minX),
        "y": Double(bar.minY),
        "width": Double(bar.width),
        "height": Double(bar.height),
        "windowWidth": 402,
        "windowHeight": 874,
      ])
    // Where UIKit puts it: along the bottom on most iPhones, down the right side on the closed iPhone Duo.
    let bounds = window.bounds
    #expect(bar.maxY == bounds.maxY || bar.maxX == bounds.maxX, "along the bottom or the right side")
    #expect(bar.width == bounds.width || bar.height == bounds.height, "across the window")
  }

  @Test func skipsAHiddenTabBar() {
    let tabs = tabs()
    let window = window(tabs)
    #expect(TabBarLocator.frame(in: window) != nil)

    tabs.tabBar.isHidden = true
    #expect(TabBarLocator.frame(in: window) == nil)
    tabs.tabBar.isHidden = false
    tabs.view.alpha = 0
    #expect(TabBarLocator.frame(in: window) == nil)
  }

  @Test func findsNoneWithoutATabBarController() {
    #expect(TabBarLocator.frame(in: window(UIViewController())) == nil)
    #expect(TabBarLocator.frame(in: UIWindow()) == nil)
  }

  @Test func skipsATabBarOutOfItsWindow() {
    let tabs = tabs()
    let window = window(tabs)
    tabs.tabBar.frame.origin.y = 2000
    #expect(TabBarLocator.frame(in: window) == nil)
  }

  @Test func toastFollowsTheTabBarWhileInAWindow() throws {
    let tabs = tabs()
    let window = window(tabs)
    let toast = ToastView(appContext: nil)
    #expect(toast.sentTabBarFrame == nil)

    window.addSubview(toast)
    let shown = try #require(toast.sentTabBarFrame)
    #expect(shown == TabBarLocator.frame(in: window))
    #expect(shown != nil)

    tabs.tabBar.isHidden = true
    toast.followTabBar()
    #expect(toast.sentTabBarFrame == .some(nil))

    toast.removeFromSuperview()
    #expect(toast.sentTabBarFrame == nil)
  }
}
