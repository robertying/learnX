import UIKit
internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.

  #if targetEnvironment(macCatalyst)
  // Wide enough for the list beside the narrowest detail pane
  // (splitViewMinDetailWidth in src/constants/Numbers.ts). Any narrower, and
  // UIKit shows the detail pane alone, with nothing to bring the list back.
  private static let minimumWindowWidth: CGFloat = 760
  #endif

  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    super.scene(scene, willConnectTo: session, options: connectionOptions)
    #if targetEnvironment(macCatalyst)
    if let restrictions = (scene as? UIWindowScene)?.sizeRestrictions {
      restrictions.minimumSize.width = max(
        restrictions.minimumSize.width,
        Self.minimumWindowWidth
      )
    }
    #endif
  }
}
