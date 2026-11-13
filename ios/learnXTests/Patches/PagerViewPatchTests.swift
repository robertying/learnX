import ObjectiveC
import Testing
import UIKit

@testable import react_native_pager_view

/// What patches/react-native-pager-view@10.0.0.patch changes: a scroll view that key-value observing has already
/// subclassed (Mac Catalyst's window observes them for its toolbar) keeps its class. A subclass of KVO's subclass
/// broke KVO, and SwiftUI then crashed in course details.
@MainActor
@Suite struct PagerViewPatchTests {
  private final class Observer: NSObject {
    override func observeValue(
      forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?,
      context: UnsafeMutableRawPointer?
    ) {}
  }

  private func className(_ object: AnyObject) -> String {
    String(cString: class_getName(object_getClass(object)!))
  }

  @Test func leavesAScrollViewThatKVOSubclassedAlone() {
    let scrollView = UIScrollView()
    let observer = Observer()
    scrollView.addObserver(observer, forKeyPath: "contentOffset", context: nil)
    defer { scrollView.removeObserver(observer, forKeyPath: "contentOffset") }
    let kvoClass = className(scrollView)
    #expect(kvoClass.hasPrefix("NSKVONotifying_"))

    PagerGestureObserver().attach(to: scrollView)
    #expect(className(scrollView) == kvoClass)

    // KVO still works.
    scrollView.contentOffset = CGPoint(x: 1, y: 0)
    #expect(scrollView.contentOffset.x == 1)
  }

  @Test func stillArbitratesThePanOfAPlainScrollView() {
    let scrollView = UIScrollView()
    PagerGestureObserver().attach(to: scrollView)
    #expect(className(scrollView).hasSuffix("_PagerBackGesture"))
  }
}
