import UIKit

/// Keeps a Mac window's frame across launches, as an `NSWindow` with a frame autosave name does in an AppKit app:
/// Mac Catalyst only brings the frame back with the window's saved state, which quitting discards unless "Close
/// windows when quitting an application" is turned off. Like AppKit's, the saved frame goes to one window (the first
/// to open); the system places the others.
public enum WindowFrameAutosave {
  static let key = "Window Frame Main"

  /// The frame last saved, if there's a usable one.
  static func savedFrame(in defaults: UserDefaults) -> CGRect? {
    guard let string = defaults.string(forKey: key) else {
      return nil
    }
    let frame = NSCoder.cgRect(for: string)
    return frame.width > 0 && frame.height > 0 ? frame : nil
  }

  /// Saves `frame`, unless it fills `screen` (full screen, which the next launch shouldn't open at) or is empty.
  static func save(_ frame: CGRect, screen: CGSize, in defaults: UserDefaults) {
    guard frame.width > 0, frame.height > 0, frame.size != screen else {
      return
    }
    defaults.set(NSCoder.string(for: frame), forKey: key)
  }

  /// Opens the app's only window at the saved frame.
  @MainActor public static func restore(_ scene: UIWindowScene, defaults: UserDefaults = .standard) {
    #if targetEnvironment(macCatalyst)
    let otherWindows = UIApplication.shared.connectedScenes.contains { $0 !== scene && $0 is UIWindowScene }
    guard !otherWindows, let frame = savedFrame(in: defaults) else {
      return
    }
    scene.requestGeometryUpdate(.Mac(systemFrame: frame))
    #endif
  }

  /// Saves the window's frame after it moved or was resized.
  @MainActor public static func save(_ scene: UIWindowScene, defaults: UserDefaults = .standard) {
    #if targetEnvironment(macCatalyst)
    save(scene.effectiveGeometry.systemFrame, screen: scene.screen.bounds.size, in: defaults)
    #endif
  }
}
