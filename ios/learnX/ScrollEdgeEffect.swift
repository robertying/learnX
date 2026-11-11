import ObjectiveC
import UIKit

extension UIScrollView {
  /// From iOS 26 the header's glass blurs what scrolls under it: the soft scroll
  /// edge effect, which is what the automatic style gives on iPhone and in an
  /// iPad split view's primary column. In its other columns (the detail pane, and
  /// the list beside the sidebar in landscape) UIKit picks the hard one instead,
  /// an opaque band with a line under the header. Every scroll view that keeps the
  /// automatic style gets the soft one, so all of them look alike. Mac keeps its
  /// own.
  static func preferSoftTopEdgeEffect() {
    _ = swizzleDidMoveToWindow
  }

  private static let swizzleDidMoveToWindow: Void = {
    guard #available(iOS 26, *),
      UIDevice.current.userInterfaceIdiom != .mac
    else { return }

    let original = #selector(UIView.didMoveToWindow)
    let replacement = #selector(UIScrollView.learnX_didMoveToWindow)
    guard
      let originalMethod = class_getInstanceMethod(UIScrollView.self, original),
      let replacementMethod = class_getInstanceMethod(
        UIScrollView.self,
        replacement
      )
    else { return }

    // Where UIScrollView only inherits the method, it gets one of its own, so
    // that UIView's stays as it is.
    if class_addMethod(
      UIScrollView.self,
      original,
      method_getImplementation(replacementMethod),
      method_getTypeEncoding(replacementMethod)
    ) {
      class_replaceMethod(
        UIScrollView.self,
        replacement,
        method_getImplementation(originalMethod),
        method_getTypeEncoding(originalMethod)
      )
    } else {
      method_exchangeImplementations(originalMethod, replacementMethod)
    }
  }()

  // Swapped with didMoveToWindow, so the call inside is the original one.
  @objc private func learnX_didMoveToWindow() {
    learnX_didMoveToWindow()
    guard #available(iOS 26, *), window != nil,
      topEdgeEffect.style == .automatic
    else { return }
    topEdgeEffect.style = .soft
  }
}
