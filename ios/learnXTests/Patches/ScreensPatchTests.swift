import ObjectiveC
import Testing
import UIKit

/// What patches/react-native-screens@4.30.1.patch changes in header items: an empty badge value is the system's
/// indicator dot (in the system red), not an empty pill. Its split view and header changes are checked by
/// ios/learnXUITests.
@MainActor
@Suite struct ScreensPatchTests {
  /// RNSBarButtonItem's initializer is only declared for Objective-C++.
  private func barButtonItem(badge: [String: Any]) throws -> UIBarButtonItem {
    let itemClass: AnyClass = try #require(NSClassFromString("RNSBarButtonItem"))
    let selector = NSSelectorFromString("initWithConfig:action:menuAction:imageLoader:")
    let method = try #require(class_getInstanceMethod(itemClass, selector))
    typealias Initializer = @convention(c) (AnyObject, Selector, NSDictionary, AnyObject?, AnyObject?, AnyObject?) ->
      UIBarButtonItem
    let initialize = unsafeBitCast(method_getImplementation(method), to: Initializer.self)
    let allocated = (itemClass as! NSObject.Type).perform(NSSelectorFromString("alloc"))!.takeUnretainedValue()
    return initialize(allocated, selector, ["title": "Settings", "badge": badge] as NSDictionary, nil, nil, nil)
  }

  @Test func emptyBadgeIsTheIndicatorDot() throws {
    guard #available(iOS 26, *) else { return }
    let badge = try #require(try barButtonItem(badge: ["value": "", "style": ["color": 0xFF00FF00]]).badge)
    #expect(badge.stringValue == nil)
    #expect(badge.backgroundColor == nil)
  }

  @Test func badgeWithTextIsAPill() throws {
    guard #available(iOS 26, *) else { return }
    let badge = try #require(try barButtonItem(badge: ["value": "New"]).badge)
    #expect(badge.stringValue == "New")
  }
}
