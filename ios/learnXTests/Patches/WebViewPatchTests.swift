import Testing
import UIKit
import WebKit

/// What patches/react-native-webview@14.0.1.patch changes on iOS: a JavaScript panel that can't be presented (the
/// web view isn't in a window) answers at once. WebKit throws when a panel's completion handler is released without
/// being called, which is what happened when the presentation silently failed.
@MainActor
@Suite struct WebViewPatchTests {
  private func webViewDelegate() throws -> WKUIDelegate {
    let viewClass = try #require(NSClassFromString("RNCWebViewImpl") as? UIView.Type)
    return try #require(viewClass.init(frame: .zero) as? WKUIDelegate)
  }

  /// WKFrameInfo has no public initializer, and the panels don't read it.
  private func frame() throws -> WKFrameInfo {
    try #require((WKFrameInfo.self as NSObject.Type).init() as? WKFrameInfo)
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
}
