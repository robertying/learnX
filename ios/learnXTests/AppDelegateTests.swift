import ObjectiveC
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
    // Metro may not be running, and then there is no bundle to load.
    if let url = ReactNativeDelegate().bundleURL() {
      #expect(url.path.hasSuffix("index.bundle"))
    }
  }

  @Test func keepsTextInputsOutOfTheRecyclePool() throws {
    let viewClass: AnyClass = try #require(NSClassFromString(TextInputRecycling.className))
    let method = try #require(class_getClassMethod(viewClass, TextInputRecycling.selector))
    typealias ShouldBeRecycled = @convention(c) (AnyClass, Selector) -> Bool
    let shouldBeRecycled = unsafeBitCast(method_getImplementation(method), to: ShouldBeRecycled.self)
    #expect(shouldBeRecycled(viewClass, TextInputRecycling.selector) == false)
  }
}
