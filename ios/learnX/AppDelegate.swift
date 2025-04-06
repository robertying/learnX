import Expo
import FirebaseCore
import RNShareMenu
import React

@UIApplicationMain
class AppDelegate: ExpoAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication
      .LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()

    UIView.appearance().tintColor = .theme

    self.moduleName = "learnX"
    self.initialProps = [:]

    return super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }

  override func application(
    _ app: UIApplication,
    open inputURL: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return ShareMenuManager.application(app, open: inputURL, options: options)
  }
}
