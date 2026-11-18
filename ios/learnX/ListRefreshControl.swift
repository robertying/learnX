import ObjectiveC
import UIKit

extension UICollectionView {
  /// A SwiftUI list (`List`, `Form`) is a collection view, and `.refreshable`
  /// gives it a refresh control, which UIKit adds behind the views the list
  /// already has. On a tab's first screen the rows are already there: the tab
  /// safe-area nudge in `-[RNSSplitHostComponentView didMoveToWindow]`
  /// (`patches/react-native-screens@4.30.1.patch`) lays the tab out while the
  /// SwiftUI tab view renders it, before SwiftUI attaches the control, and it
  /// has to, or an iPad's column bars stay under the tab bar. The first
  /// section's background, which reaches far above the rows, then covers the
  /// spinner wherever the navigation bar doesn't hold it: on the closed iPhone
  /// Duo the bar keeps the title in one row that doesn't stretch, and pulling
  /// Today showed an empty gap. Every collection view's refresh control is
  /// drawn above its rows. React Native's RefreshControl is on a plain scroll
  /// view and keeps UIKit's placement.
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
