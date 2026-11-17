import Testing
import UIKit

@testable import LearnXToast

@MainActor
@Suite struct TabBarLocatorTests {
  /// A shown window around `root`, laid out.
  private func window(_ root: UIViewController) -> UIWindow {
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 402, height: 874))
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
    #expect(frame["x"] == bar.minX)
    #expect(frame["y"] == bar.minY)
    #expect(frame["width"] == bar.width)
    #expect(frame["height"] == bar.height)
    #expect(frame["windowWidth"] == 402)
    #expect(frame["windowHeight"] == 874)
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
}
