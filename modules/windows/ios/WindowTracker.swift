import UIKit
import UIKit.UIGestureRecognizerSubclass

/// The app's windows on iPad and Mac. Each window is a scene with its own React root on the one JS runtime, and its
/// id is its scene session's persistent identifier, which the scene delegate hands JS as the root's `windowId`.
///
/// Links, menu commands, notification taps and toasts reach JS through emitters every root listens to, so JS asks
/// which window they're for (`targetWindowId`): the window the person last touched, clicked or brought to the front,
/// which takes the menu bar's commands and the keyboard, or the one a link, activity or quick action was just
/// delivered to.
public enum WindowTracker {
  /// The activity that `open(_:)` starts a window with.
  public static let openActivityType = "io.robertying.learnx.openWindow"
  static let urlKey = "url"

  private static let state = WindowState()

  /// The window that window-wide events are for, if one is known yet.
  public static var targetWindowId: String? { state.target }

  /// Whether the app can show more than one window: iPad and Mac, not iPhone. Set by `start(_:)`.
  public static var supportsMultipleWindows: Bool { state.supportsMultipleWindows }

  public static func setTarget(_ windowId: String) {
    state.target = windowId
  }

  @MainActor public static func setTarget(_ scene: UIScene) {
    setTarget(scene.session.persistentIdentifier)
  }

  /// Call once from the app delegate as the app launches: from then on, the key window is the target.
  @MainActor public static func start(_ application: UIApplication) {
    state.supportsMultipleWindows = application.supportsMultipleScenes
    KeyWindowObserver.shared.start()
  }

  /// Makes `window` the target whenever the person touches or clicks in it. On iPad each window on screen stays the
  /// key window of its own scene, so moving to another window posts no `didBecomeKeyNotification`.
  @MainActor public static func track(_ window: UIWindow) {
    if window.gestureRecognizers?.contains(where: { $0 is TouchTargetRecognizer }) != true {
      window.addGestureRecognizer(TouchTargetRecognizer())
    }
  }

  // MARK: Restoring windows

  /// Remembers the learnx:// link of what a window shows, which reopens it when the window comes back after a
  /// relaunch (`restorationActivity(for:)`). Nil forgets it.
  public static func setLink(_ link: String?, for windowId: String) {
    state.setLink(link, for: windowId)
  }

  static func link(for windowId: String) -> String? {
    state.link(for: windowId)
  }

  /// Forgets windows the person closed for good.
  public static func forget(_ windowIds: some Sequence<String>) {
    for id in windowIds {
      state.setLink(nil, for: id)
    }
  }

  /// What a window's scene saves to come back to the same place, or nil when it has nothing to restore.
  public static func restorationActivity(for windowId: String) -> NSUserActivity? {
    link(for: windowId).flatMap(URL.init(string:)).map(activity(opening:))
  }

  // MARK: Naming windows

  /// Names a window after what it shows: the Mac lists it by this name in the Dock's and the Window menu, and iPadOS
  /// in App Exposé, where every window would otherwise be called learnX.
  @MainActor public static func setTitle(
    _ title: String,
    for windowId: String,
    application: UIApplication = .shared
  ) {
    let scene = application.connectedScenes.first { $0.session.persistentIdentifier == windowId }
    scene?.title = title
  }

  // MARK: Opening windows

  static func activity(opening url: URL) -> NSUserActivity {
    let activity = NSUserActivity(activityType: openActivityType)
    activity.userInfo = [urlKey: url.absoluteString]
    return activity
  }

  /// The learnx:// link an activity from `activity(opening:)` opens.
  static func url(of activity: NSUserActivity) -> URL? {
    guard activity.activityType == openActivityType, let link = activity.userInfo?[urlKey] as? String else {
      return nil
    }
    return URL(string: link)
  }

  /// What a connecting window opens with: a link it was opened with, else a window opened by `open(_:)`, else what
  /// it showed before a relaunch (its session's restoration activity, listed last).
  public static func initialURL(urls: [URL], activities: [NSUserActivity]) -> URL? {
    urls.first ?? activities.lazy.compactMap(url(of:)).first
  }

  /// Opens a new window on `url`, a learnx:// link.
  @MainActor public static func open(_ url: URL, application: UIApplication = .shared) {
    let options = UIScene.ActivationRequestOptions()
    // Where it opens from, so iPadOS animates it out of that window.
    options.requestingScene = application.connectedScenes.first {
      $0.session.persistentIdentifier == targetWindowId
    }
    let request = UISceneSessionActivationRequest(
      role: .windowApplication,
      userActivity: activity(opening: url),
      options: options
    )
    application.activateSceneSession(for: request, errorHandler: nil)
  }
}

/// What `WindowTracker` keeps. JS reads it on its own thread, UIKit sets it on the main one.
final class WindowState: @unchecked Sendable {
  private let lock = NSLock()
  private var _target: String?
  private var _supportsMultipleWindows = false
  private var links: [String: String] = [:]

  var target: String? {
    get { lock.withLock { _target } }
    set { lock.withLock { _target = newValue } }
  }

  var supportsMultipleWindows: Bool {
    get { lock.withLock { _supportsMultipleWindows } }
    set { lock.withLock { _supportsMultipleWindows = newValue } }
  }

  func link(for windowId: String) -> String? {
    lock.withLock { links[windowId] }
  }

  func setLink(_ link: String?, for windowId: String) {
    lock.withLock { links[windowId] = link }
  }
}

/// Makes the window that becomes key the target. On iPad, the window the person last touched is key; on the Mac,
/// the frontmost one.
@MainActor final class KeyWindowObserver: NSObject {
  static let shared = KeyWindowObserver()
  private var started = false

  func start() {
    guard !started else {
      return
    }
    started = true
    // A selector, unlike a block, doesn't hand the window to a @Sendable closure.
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(windowBecameKey(_:)),
      name: UIWindow.didBecomeKeyNotification,
      object: nil
    )
  }

  @objc func windowBecameKey(_ notification: Notification) {
    if let scene = (notification.object as? UIWindow)?.windowScene {
      WindowTracker.setTarget(scene)
    }
  }
}

/// Notes the window a touch starts in, then fails at once, so it never holds up or cancels the window's own gestures.
final class TouchTargetRecognizer: UIGestureRecognizer {
  init() {
    super.init(target: nil, action: nil)
    cancelsTouchesInView = false
    delaysTouchesEnded = false
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
    // Added to the window itself (`track(_:)`).
    if let scene = (view as? UIWindow ?? view?.window)?.windowScene {
      WindowTracker.setTarget(scene)
    }
    state = .failed
  }
}
