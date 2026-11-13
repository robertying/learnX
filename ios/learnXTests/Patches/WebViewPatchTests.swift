import Testing
import UIKit
import WebKit

/// What patches/react-native-webview@14.0.1.patch changes on iOS: a JavaScript panel that can't be presented (the
/// web view isn't in a window) answers at once (WebKit throws when a panel's completion handler is released without
/// being called, which is what happened when the presentation silently failed), and a page loaded at its top stays
/// below a translucent header until it's scrolled.
@MainActor
@Suite struct WebViewPatchTests {
  private func webViewDelegate() throws -> WKUIDelegate {
    let viewClass = try #require(NSClassFromString("RNCWebViewImpl") as? UIView.Type)
    return try #require(viewClass.init(frame: .zero) as? WKUIDelegate)
  }

  /// WKFrameInfo has no public initializer, and the panels don't read it. A bare one crashes when it's released, so
  /// it's kept.
  private func frame() throws -> WKFrameInfo {
    let frame = try #require((WKFrameInfo.self as NSObject.Type).init() as? WKFrameInfo)
    return Unmanaged.passRetained(frame).takeUnretainedValue()
  }

  @Test func alertOffScreenCompletesAtOnce() throws {
    var completed = false
    try webViewDelegate().webView?(
      WKWebView(), runJavaScriptAlertPanelWithMessage: "a", initiatedByFrame: frame()
    ) { completed = true }
    #expect(completed)
  }

  @Test func confirmOffScreenAnswersNo() throws {
    var answer: Bool?
    try webViewDelegate().webView?(
      WKWebView(), runJavaScriptConfirmPanelWithMessage: "c", initiatedByFrame: frame()
    ) { answer = $0 }
    #expect(answer == false)
  }

  @Test func promptOffScreenAnswersNothing() throws {
    var answered = false
    var text: String? = "unset"
    try webViewDelegate().webView?(
      WKWebView(), runJavaScriptTextInputPanelWithPrompt: "p", defaultText: "d", initiatedByFrame: frame()
    ) {
      answered = true
      text = $0
    }
    #expect(answered)
    #expect(text == nil)
  }

  /// A web view in a window, which is when RNCWebViewImpl makes its WKWebView, with the inset a translucent header
  /// gives it in the app.
  private func webViewInWindow() async throws -> (impl: UIView, webView: WKWebView, window: UIWindow) {
    // Run alone, the suite can start before the app's scene connects.
    for _ in 0..<50 where UIApplication.shared.connectedScenes.isEmpty {
      try await Task.sleep(for: .milliseconds(100))
    }
    let scene = try #require(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let window = UIWindow(windowScene: scene)
    let viewClass = try #require(NSClassFromString("RNCWebViewImpl") as? UIView.Type)
    let impl = viewClass.init(frame: CGRect(x: 0, y: 0, width: 400, height: 800))
    window.addSubview(impl)
    let webView = try #require(impl.subviews.lazy.compactMap { $0 as? WKWebView }.first)
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.scrollView.contentInset.top = 100
    return (impl, webView, window)
  }

  private func finishLoading(_ impl: UIView, _ webView: WKWebView) throws {
    let delegate = try #require(impl as? WKNavigationDelegate)
    delegate.webView?(webView, didFinish: nil)
  }

  @Test func pageLoadedAtItsTopStaysBelowTheHeader() async throws {
    let (impl, webView, window) = try await webViewInWindow()
    defer { impl.removeFromSuperview() }
    _ = window
    let scrollView = webView.scrollView
    scrollView.contentSize = CGSize(width: 400, height: 2000)
    scrollView.contentOffset = .zero

    try finishLoading(impl, webView)
    #expect(scrollView.contentOffset.y == -100)

    // WebKit fitting an image document to the width puts it back at offset 0.
    scrollView.contentOffset = .zero
    #expect(scrollView.contentOffset.y == -100)
  }

  @Test func scrolledPageMovesFreely() async throws {
    let (impl, webView, window) = try await webViewInWindow()
    defer { impl.removeFromSuperview() }
    _ = window
    let scrollView = webView.scrollView
    scrollView.contentSize = CGSize(width: 400, height: 2000)
    scrollView.contentOffset = .zero
    try finishLoading(impl, webView)

    scrollView.delegate?.scrollViewWillBeginDragging?(scrollView)
    scrollView.contentOffset = CGPoint(x: 0, y: -50)
    #expect(scrollView.contentOffset.y == -50)
  }
}
