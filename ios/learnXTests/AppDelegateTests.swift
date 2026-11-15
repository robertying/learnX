import ObjectiveC
import React
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
    // React Native asks Metro for its status before it uses the host; the stub answers as a running Metro would.
    let settings = RCTBundleURLProvider.sharedSettings()
    let previous = settings.jsLocation
    URLProtocol.registerClass(MetroStatusStub.self)
    settings.jsLocation = MetroStatusStub.hostPort
    defer {
      settings.jsLocation = previous
      URLProtocol.unregisterClass(MetroStatusStub.self)
    }

    let url = ReactNativeDelegate().bundleURL()
    #expect(url?.host() == "metro.test")
    #expect(url?.port == 8081)
    #expect(url?.path() == "/index.bundle")
  }

  @Test func keepsTextInputsOutOfTheRecyclePool() throws {
    let viewClass: AnyClass = try #require(NSClassFromString(TextInputRecycling.className))
    let method = try #require(class_getClassMethod(viewClass, TextInputRecycling.selector))
    typealias ShouldBeRecycled = @convention(c) (AnyClass, Selector) -> Bool
    let shouldBeRecycled = unsafeBitCast(method_getImplementation(method), to: ShouldBeRecycled.self)
    #expect(shouldBeRecycled(viewClass, TextInputRecycling.selector) == false)
  }
}

/// Answers Metro's status check (`/status`) for `hostPort`, so the test needs no Metro running.
final class MetroStatusStub: URLProtocol {
  static let hostPort = "metro.test:8081"

  override class func canInit(with request: URLRequest) -> Bool {
    request.url?.host() == "metro.test"
  }

  override class func canonicalRequest(for request: URLRequest) -> URLRequest {
    request
  }

  override func startLoading() {
    guard let url = request.url,
      let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: nil)
    else {
      return
    }
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: Data("packager-status:running".utf8))
    client?.urlProtocolDidFinishLoading(self)
  }

  override func stopLoading() {}
}
