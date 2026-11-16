@testable import ExpoModulesCore
import QuickLook
import Testing
import UIKit

@testable import LearnXQuickLook

@MainActor
@Suite struct QuickLookViewTests {
  @Test func takesTheFileFromJS() throws {
    let appContext = AppContext()
    let views = QuickLookModule(appContext: appContext).definition().views
    let props = try #require(views["QuickLookView"]).propsDict()
    let view = QuickLookView(appContext: nil)
    try #require(props["uri"]).set(value: "file:///tmp/a.docx", onView: view, appContext: appContext)
    #expect(view.url == URL(fileURLWithPath: "/tmp/a.docx"))
    #expect(view.numberOfPreviewItems(in: view.controller) == 1)
    let item = view.previewController(view.controller, previewItemAt: 0)
    #expect(item.previewItemURL == URL(fileURLWithPath: "/tmp/a.docx"))
  }

  @Test func showsNothingForAWebAddress() {
    let view = QuickLookView(appContext: nil)
    view.setURI("https://example.com/a.docx")
    #expect(view.url == nil)
    #expect(view.numberOfPreviewItems(in: view.controller) == 0)
  }

  @Test func fillsTheView() {
    let view = QuickLookView(appContext: nil)
    view.frame = CGRect(x: 0, y: 0, width: 320, height: 480)
    view.layoutIfNeeded()
    #expect(view.controller.view.superview === view)
    #expect(view.controller.view.frame == view.bounds)
  }

  @Test func joinsTheScreensViewControllerWhileInAWindow() {
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 480))
    let screen = UIViewController()
    window.rootViewController = screen
    let view = QuickLookView(appContext: nil)

    screen.view.addSubview(view)
    #expect(view.controller.parent === screen)
    // Moving within the window keeps it.
    screen.view.addSubview(view)
    #expect(view.controller.parent === screen)

    view.removeFromSuperview()
    #expect(view.controller.parent == nil)
  }
}
