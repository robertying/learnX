import ObjectiveC
import UIKit

extension UICollectionView {
  /// A SwiftUI list (`List`, `Form`) is a collection view, and `.refreshable`
  /// gives it a refresh control. UIKit adds a refresh control behind the views a
  /// scroll view already has. SwiftUI normally attaches it before the list has
  /// any rows, so the rows go in behind it. On a tab's first screen it comes too
  /// late: the synchronous tab safe-area nudge in
  /// `-[RNSSplitHostComponentView didMoveToWindow]`
  /// (`patches/react-native-screens@4.30.1.patch`) lays out the tab's columns
  /// while the SwiftUI tab bar renders, which lays out the list's rows and
  /// section backgrounds before SwiftUI gets to attach the refresh control. The
  /// first section's background reaches far above the list, so it then covers
  /// the spinner: Today's pull to refresh showed an empty gap. Every
  /// collection view's refresh control is drawn above its rows, as it is when
  /// SwiftUI attaches it in time. React Native's RefreshControl is on a plain
  /// scroll view and keeps UIKit's placement.
  static func keepRefreshControlAboveRows() {
    _ = swizzleSetRefreshControl
  }

  private static let swizzleSetRefreshControl: Void = {
    let original = #selector(setter: UIScrollView.refreshControl)
    let replacement = #selector(UICollectionView.learnX_setRefreshControl(_:))
    guard
      let originalMethod = class_getInstanceMethod(
        UICollectionView.self,
        original
      ),
      let replacementMethod = class_getInstanceMethod(
        UICollectionView.self,
        replacement
      )
    else { return }

    // UICollectionView only inherits the setter, so it gets one of its own,
    // and UIScrollView's (React Native's lists) stays as it is.
    if class_addMethod(
      UICollectionView.self,
      original,
      method_getImplementation(replacementMethod),
      method_getTypeEncoding(replacementMethod)
    ) {
      class_replaceMethod(
        UICollectionView.self,
        replacement,
        method_getImplementation(originalMethod),
        method_getTypeEncoding(originalMethod)
      )
    } else {
      method_exchangeImplementations(originalMethod, replacementMethod)
    }
  }()

  // Swapped with the refreshControl setter, so the call inside is the original
  // one. Above the rows (zPosition 0) and below the scroll indicators.
  @objc private func learnX_setRefreshControl(_ control: UIRefreshControl?) {
    learnX_setRefreshControl(control)
    control?.layer.zPosition = 1
  }
}
