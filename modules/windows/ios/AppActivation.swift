import Foundation

/// Whether the Mac app is the frontmost one. A Mac Catalyst app stays active in UIKit while another app is in front,
/// so React Native's AppState never changes there; AppKit's notifications say when the app was left and is back.
/// They're never posted on iPhone or iPad.
enum AppActivation {
  static let didBecomeActive = Notification.Name("NSApplicationDidBecomeActiveNotification")
  static let didResignActive = Notification.Name("NSApplicationDidResignActiveNotification")

  static let notifications = [didBecomeActive, didResignActive]

  /// Whether the app is active after the notification `name`; nil for any other notification.
  static func isActive(after name: Notification.Name) -> Bool? {
    switch name {
    case didBecomeActive: true
    case didResignActive: false
    default: nil
    }
  }
}
