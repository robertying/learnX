import UIKit
internal import Expo
internal import LearnXWindows

/// One per window. On iPad and Mac the app can have several windows, each its own React root on the one JS runtime
/// (`src/hooks/useWindow.tsx`).
@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  #if targetEnvironment(macCatalyst)
  // Wide enough for the list beside the narrowest detail pane
  // (splitViewMinDetailWidth in src/constants/Numbers.ts). Any narrower, and
  // UIKit shows the detail pane alone, with nothing to bring the list back.
  private static let minimumWindowWidth: CGFloat = 760
  #endif

  /// The root's props: which window it is, and the learnx:// link it opens with. React Native's
  /// `Linking.getInitialURL()` only knows the link that launched the app, not one a later window opened with.
  private var windowProperties: [AnyHashable: Any]?

  override var initialProperties: [AnyHashable: Any]? {
    windowProperties
  }

  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    // Before React Native starts: what the connection delivers is for this window.
    WindowTracker.setTarget(scene)
    var properties: [AnyHashable: Any] = ["windowId": session.persistentIdentifier]
    let initialURL = WindowTracker.initialURL(
      urls: connectionOptions.urlContexts.map(\.url),
      activities: Array(connectionOptions.userActivities) + [session.stateRestorationActivity].compactMap { $0 }
    )
    if let initialURL {
      properties["initialURL"] = initialURL.absoluteString
    }
    windowProperties = properties

    super.scene(scene, willConnectTo: session, options: connectionOptions)
    if let window {
      WindowTracker.track(window)
    }
    #if targetEnvironment(macCatalyst)
    if let windowScene = scene as? UIWindowScene {
      if let restrictions = windowScene.sizeRestrictions {
        restrictions.minimumSize.width = max(
          restrictions.minimumSize.width,
          Self.minimumWindowWidth
        )
      }
      WindowFrameAutosave.restore(windowScene)
    }
    #endif
  }

  #if targetEnvironment(macCatalyst)
  /// Called after the window moves or is resized, among other changes.
  func windowScene(
    _ windowScene: UIWindowScene,
    didUpdate previousCoordinateSpace: any UICoordinateSpace,
    interfaceOrientation previousInterfaceOrientation: UIInterfaceOrientation,
    traitCollection previousTraitCollection: UITraitCollection
  ) {
    WindowFrameAutosave.save(windowScene)
  }
  #endif

  override func sceneDidDisconnect(_ scene: UIScene) {
    // Expo mirrors the newest window onto the app delegate. Left there, a closed window would keep its React root
    // running, so hand over another window's.
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate, let window, appDelegate.window === window {
      appDelegate.window = UIApplication.shared.connectedScenes
        .lazy
        .filter { $0 !== scene }
        .compactMap { ($0.delegate as? SceneDelegate)?.window }
        .first
    }
    super.sceneDidDisconnect(scene)
  }

  // What these deliver is for this window, so it becomes the target before JS hears of it.

  override func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    WindowTracker.setTarget(scene)
    super.scene(scene, openURLContexts: URLContexts)
  }

  override func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    WindowTracker.setTarget(scene)
    super.scene(scene, continue: userActivity)
  }

  override func windowScene(
    _ windowScene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    WindowTracker.setTarget(windowScene)
    super.windowScene(windowScene, performActionFor: shortcutItem, completionHandler: completionHandler)
  }

  /// Reopens what the window showed when it comes back after a relaunch.
  @objc func stateRestorationActivity(for scene: UIScene) -> NSUserActivity? {
    WindowTracker.restorationActivity(for: scene.session.persistentIdentifier)
  }
}
