import CoreGraphics
import Foundation

/// What the Mac's menu bar plugin does for the app: AppKit's status item, Dock icon and launch event, which Mac
/// Catalyst has no API for. The plugin (`ios/MacMenuBar`, an AppKit bundle the Mac app loads from its PlugIns)
/// compiles this file too; the Objective-C name makes both copies the same protocol at run time.
@MainActor
@objc(LXMenuBarHosting)
protocol MenuBarHosting: NSObjectProtocol {
  /// Whether macOS opened the app as a login item. Only known while the app finishes launching.
  var launchedAsLoginItem: Bool { get }

  /// Shows learnX's item in the menu bar, with a menu of Open, Check for New Content and Quit, titled in the app's
  /// language. Showing it again changes the titles.
  func showStatusItem(
    openTitle: String,
    checkTitle: String,
    quitTitle: String,
    onOpen: @escaping () -> Void,
    onCheck: @escaping () -> Void
  )

  /// Shows learnX in the Dock and the app switcher, with its menus, or leaves it only in the menu bar.
  func setShowsInDock(_ shows: Bool)

  /// Brings learnX to the front.
  func activate()
}

/// The menu bar item's icon: the X of the app icon (`ios/learnX/AppIcon.icon/Assets/1-text.svg`), one outline of
/// straight lines, drawn as a template image so macOS tints it like the other menu bar icons.
enum MenuBarIcon {
  /// The outline in the SVG's coordinates, origin at the top left.
  static let outline: [CGPoint] = [
    (0.6875, 632), (234.75, 287.25), (215.938, 348.062), (215.938, 313.062), (3.3125, 0.6875), (98.25, 0.6875),
    (267.125, 254.875), (303, 254.875), (250.938, 282.875), (440.375, 0.6875), (530.062, 0.6875), (311.75, 317),
    (311.75, 352), (292.938, 291.188), (525.25, 632), (430.75, 632), (262.75, 380), (226.875, 380),
    (278.938, 352.438), (89.9375, 632),
  ].map { CGPoint(x: $0.0, y: $0.1) }

  /// The SVG's size.
  static let artSize = CGSize(width: 531, height: 632)

  /// The outline fit into `size`, centered, origin at the top left.
  static func outline(fitting size: CGSize) -> [CGPoint] {
    let scale = min(size.width / artSize.width, size.height / artSize.height)
    let dx = (size.width - artSize.width * scale) / 2
    let dy = (size.height - artSize.height * scale) / 2
    return outline.map { CGPoint(x: dx + $0.x * scale, y: dy + $0.y * scale) }
  }
}
