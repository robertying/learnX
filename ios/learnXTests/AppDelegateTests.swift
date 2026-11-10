import Testing
import UIKit

@testable import learnX

/// The tests run inside the app, so it has launched through its delegates already.
@MainActor
@Suite struct AppDelegateTests {
  @Test func launchedReactNative() throws {
    let delegate = try #require(UIApplication.shared.delegate as? AppDelegate)
    #expect(delegate.reactNativeFactory != nil)
    #expect(delegate.reactNativeFactoryModuleName == "learnX")
  }

  @Test func loadsTheBundleFromMetroInDebug() {
    // Debug builds ask Metro, which may not be running.
    _ = ReactNativeDelegate().bundleURL()
  }
}
