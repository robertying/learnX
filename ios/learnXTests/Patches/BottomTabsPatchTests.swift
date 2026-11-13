import Testing
import UIKit

@testable import react_native_bottom_tabs

/// What patches/react-native-bottom-tabs@1.5.0.patch changes that can be checked outside a running tab bar: the
/// label font and the tab view's retain cycle. Its tab bar changes (Mac Catalyst toolbar, sidebar state, safe area)
/// are checked by ios/learnXUITests.
@MainActor
@Suite struct BottomTabsPatchTests {
  @Test func keepsTheSystemLabelFontWithoutASize() {
    let attributes = TabBarFontSize.createFontAttributes(size: nil, color: .red)
    #expect(attributes[.font] == nil)
    #expect(attributes[.foregroundColor] as? UIColor == .red)
  }

  @Test func setsAFontForAnExplicitSize() throws {
    let font = try #require(TabBarFontSize.createFontAttributes(size: 12)[.font] as? UIFont)
    #expect(font.pointSize == 12)
  }

  @Test func defaultSizeWithAFamilyOrWeight() throws {
    let font = try #require(TabBarFontSize.createFontAttributes(size: nil, weight: "600")[.font] as? UIFont)
    #expect(font.pointSize == TabBarFontSize.defaultSize)
  }

  @Test func tabViewIsReleasedAfterItsHostingControllerIsMade() throws {
    weak var released: TabViewProvider?
    let parent = UIViewController()
    autoreleasepool {
      let tabView = TabViewProvider(frame: CGRect(x: 0, y: 0, width: 400, height: 800))
      parent.view.addSubview(tabView)
      tabView.layoutIfNeeded()
      // It made its hosting controller, which holds the closures that called back into it.
      #expect(!parent.children.isEmpty)
      tabView.removeFromSuperview()
      for child in parent.children {
        child.willMove(toParent: nil)
        child.removeFromParent()
      }
      released = tabView
    }
    #expect(released == nil)
  }
}
