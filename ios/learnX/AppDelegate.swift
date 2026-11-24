internal import Expo
internal import LearnXMenuBar
internal import LearnXMenus
internal import LearnXWindows
import ObjectiveC
import React
import ReactAppDependencyProvider

// Main-actor conformance: ExpoAppSceneDelegate reads the provider from scene(_:willConnectTo:), on the main actor.
@main
class AppDelegate: ExpoAppDelegate, @MainActor ExpoReactNativeFactoryProvider {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  var reactNativeFactoryModuleName: String { "learnX" }

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication
      .LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    CrashReporting.start()
    UIScrollView.preferSoftTopEdgeEffect()
    UICollectionView.keepRefreshControlAboveRows()
    TextInputRecycling.disable()
    WindowTracker.start(application)

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    let launched = super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )
    #if targetEnvironment(macCatalyst)
    MenuBar.start()
    if MenuBar.opensHidden {
      // Opened as a login item, with no window: JS starts without one, to sync and show the menu bar item. A
      // window opened later joins this runtime.
      factory.rootViewFactory.initializeReactHost(
        launchOptions: launchOptions,
        bundleConfiguration: factory.bundleConfiguration,
        devMenuConfiguration: factory.devMenuConfiguration ?? .default()
      )
    }
    #endif
    return launched
  }

  /// Windows closed for good (swiped away in App Exposé) have nothing left to restore.
  func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    WindowTracker.forget(sceneSessions.map(\.persistentIdentifier))
  }

  // Refresh, Search, Settings… and next/previous item in the menu bar, with their shortcuts.
  override func buildMenu(with builder: UIMenuBuilder) {
    super.buildMenu(with: builder)
    AppCommands.buildMenu(with: builder)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(
        forBundleRoot: "index"
      )
    #else
      return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}

/// UIKit's AutoFill remembers the text fields it took as a username or password field, so a recycled credential
/// text input would carry that role into an unrelated one. React Native keeps a view out of its recycle pool when its
/// class answers `shouldBeRecycled` with NO, so text inputs get that. Call before React Native registers the class.
enum TextInputRecycling {
  static let className = "RCTTextInputComponentView"
  static let selector = NSSelectorFromString("shouldBeRecycled")

  static func disable() {
    _ = addClassMethod
  }

  private static let addClassMethod: Void = {
    guard let viewClass = NSClassFromString(className), let metaclass = object_getClass(viewClass) else {
      return
    }
    let shouldBeRecycled: @convention(block) (AnyClass) -> Bool = { _ in false }
    class_addMethod(metaclass, selector, imp_implementationWithBlock(shouldBeRecycled), "B@:")
  }()
}
