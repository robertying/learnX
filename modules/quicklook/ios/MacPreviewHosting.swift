import CoreGraphics
import Foundation

/// What the Mac's preview plugin does for `QuickLookView`: it places AppKit's `QLPreviewView` in the `NSWindow` that
/// shows the view's `UIWindow`. The plugin (`ios/MacPreview`, an AppKit bundle the Mac app loads from its PlugIns)
/// compiles this file too; the Objective-C name makes both copies the same protocol at run time.
@MainActor
@objc(LXMacPreviewHosting)
protocol MacPreviewHosting: NSObjectProtocol {
  /// Finds the `NSWindow` that shows `uiWindow`; false if there is none.
  func attach(toWindowOf uiWindow: AnyObject) -> Bool

  /// The file to preview, or nil for none.
  func setURL(_ url: URL?)

  /// Shows the preview at `frame`, given in the coordinates of a `UIWindow` of `windowSize`, leaving out `holes`:
  /// the areas, in the same coordinates, where windows above the view draw over it (a toast). Each hole is four
  /// numbers: x, y, width and height.
  func show(frame: CGRect, windowSize: CGSize, holes: [Double])

  /// Hides the preview, keeping it loaded.
  func hide()

  /// Removes the preview from the window.
  func detach()
}

enum MacPreviewGeometry {
  /// `rects` as the four numbers each that `MacPreviewHosting.show` takes.
  static func flatten(_ rects: [CGRect]) -> [Double] {
    rects.flatMap { [$0.minX, $0.minY, $0.width, $0.height].map(Double.init) }
  }

  /// The rects in numbers from `flatten`.
  static func rects(_ numbers: [Double]) -> [CGRect] {
    stride(from: 0, to: numbers.count - 3, by: 4).map {
      CGRect(x: numbers[$0], y: numbers[$0 + 1], width: numbers[$0 + 2], height: numbers[$0 + 3])
    }
  }

  /// `frame`, in the coordinates of a `UIWindow` of `windowSize` (origin at the top left), in those of an `NSView` of
  /// `bounds` that shows the whole window. `flipped` is the view's `isFlipped`: false puts the origin at the bottom
  /// left.
  static func frame(_ frame: CGRect, windowSize: CGSize, in bounds: CGRect, flipped: Bool) -> CGRect {
    guard windowSize.width > 0, windowSize.height > 0 else {
      return .zero
    }
    let scaleX = bounds.width / windowSize.width
    let scaleY = bounds.height / windowSize.height
    let y = flipped ? frame.minY * scaleY : bounds.height - frame.maxY * scaleY
    return CGRect(
      x: bounds.minX + frame.minX * scaleX,
      y: bounds.minY + y,
      width: frame.width * scaleX,
      height: frame.height * scaleY
    )
  }
}
