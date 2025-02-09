import Expo
import ReactAppDependencyProvider
import FirebaseCore
import RNShareMenu

@main
class AppDelegate: EXAppDelegateWrapper {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication
      .LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()

    UIView.appearance().tintColor = .theme

    self.moduleName = "learnX"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]

    return super.application(
      application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }

  override func application(
    _ app: UIApplication, open inputURL: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return ShareMenuManager.application(app, open: inputURL, options: options)
  }
}
