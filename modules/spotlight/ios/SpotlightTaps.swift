import CoreSpotlight
import ExpoModulesCore

/// A Spotlight item's unique identifier: its domain (`notice`, `assignment`) and its id there.
struct SpotlightIdentifier {
  let domain: String
  let id: String

  var rawValue: String { "\(domain):\(id)" }

  init(domain: String, id: String) {
    self.domain = domain
    self.id = id
  }

  init?(rawValue: String) {
    guard let separator = rawValue.firstIndex(of: ":") else {
      return nil
    }
    domain = String(rawValue[..<separator])
    id = String(rawValue[rawValue.index(after: separator)...])
  }
}

/// Passes tapped search results to JS, or keeps the last one until JS asks for it: a result that launches the app
/// arrives while the scene connects, before JS runs.
final class SpotlightTaps: @unchecked Sendable {
  static let shared = SpotlightTaps()

  private let lock = NSLock()
  private var pending: SpotlightIdentifier?
  private var listener: ((SpotlightIdentifier) -> Void)?

  func setListener(_ listener: ((SpotlightIdentifier) -> Void)?) {
    lock.withLock { self.listener = listener }
  }

  func open(_ identifier: SpotlightIdentifier) {
    let listener = lock.withLock {
      if self.listener == nil {
        pending = identifier
      }
      return self.listener
    }
    listener?(identifier)
  }

  func takePending() -> SpotlightIdentifier? {
    lock.withLock {
      defer { pending = nil }
      return pending
    }
  }
}

/// Receives the activity of a tapped search result, forwarded from the scene delegate.
public final class SpotlightAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard userActivity.activityType == CSSearchableItemActionType,
      let rawValue = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String,
      let identifier = SpotlightIdentifier(rawValue: rawValue)
    else {
      return false
    }
    SpotlightTaps.shared.open(identifier)
    // The subscriber manager waits for every subscriber that responds to call it.
    restorationHandler(nil)
    return true
  }
}
