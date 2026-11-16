@testable import ExpoModulesCore
import QuickLook
import Testing
import UIKit

@testable import LearnXQuickLook

/// A window with a screen in it, shown so that its root view is in it; in `scene` when given.
@MainActor
private func shownWindow(in scene: UIWindowScene? = nil) -> (UIWindow, UIViewController) {
  let window = scene.map(UIWindow.init(windowScene:)) ?? UIWindow()
  window.frame = CGRect(x: 0, y: 0, width: 320, height: 480)
  let screen = UIViewController()
  window.rootViewController = screen
  window.isHidden = false
  return (window, screen)
}

@MainActor
@Suite(.serialized) struct QuickLookViewTests {
  @Test func takesTheFileFromJS() throws {
    let appContext = AppContext()
    let views = QuickLookModule(appContext: appContext).definition().views
    let props = try #require(views["QuickLookView"]).propsDict()
    let view = QuickLookView(appContext: nil)
    try #require(props["uri"]).set(value: "file:///tmp/a.docx", onView: view, appContext: appContext)
    let controller = try #require(view.controller)
    #expect(view.url == URL(fileURLWithPath: "/tmp/a.docx"))
    #expect(view.numberOfPreviewItems(in: controller) == 1)
    let item = view.previewController(controller, previewItemAt: 0)
    #expect(item.previewItemURL == URL(fileURLWithPath: "/tmp/a.docx"))
  }

  @Test func showsNothingForAWebAddress() throws {
    let view = QuickLookView(appContext: nil)
    view.setURI("https://example.com/a.docx")
    #expect(view.url == nil)
    #expect(view.numberOfPreviewItems(in: try #require(view.controller)) == 0)
  }

  @Test func fillsTheView() throws {
    let view = QuickLookView(appContext: nil)
    let controller = try #require(view.controller)
    view.frame = CGRect(x: 0, y: 0, width: 320, height: 480)
    view.layoutIfNeeded()
    #expect(controller.view.superview === view)
    #expect(controller.view.frame == view.bounds)
  }

  @Test func joinsTheScreensViewControllerWhileInAWindow() throws {
    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    let view = QuickLookView(appContext: nil)
    let controller = try #require(view.controller)

    screen.view.addSubview(view)
    #expect(controller.parent === screen)
    // Moving within the window keeps it.
    screen.view.addSubview(view)
    #expect(controller.parent === screen)

    view.removeFromSuperview()
    #expect(controller.parent == nil)
  }
}

@MainActor
private final class FakeHost: NSObject, MacPreviewHosting {
  var canAttach = true
  var attachedTo: AnyObject?
  var url: URL?
  var shown: (frame: CGRect, windowSize: CGSize, holes: [CGRect])?
  var hidden = false
  var detached = false

  func attach(toWindowOf uiWindow: AnyObject) -> Bool {
    attachedTo = uiWindow
    return canAttach
  }

  func setURL(_ url: URL?) {
    self.url = url
  }

  func show(frame: CGRect, windowSize: CGSize, holes: [Double]) {
    shown = (frame, windowSize, MacPreviewGeometry.rects(holes))
    hidden = false
  }

  func hide() {
    hidden = true
  }

  func detach() {
    detached = true
  }
}

@MainActor
@Suite(.serialized) struct MacPreviewTests {
  /// A view made with `host` as the Mac's preview host.
  private func view(with host: FakeHost) -> QuickLookView {
    let makeHost = QuickLookView.makeHost
    QuickLookView.makeHost = { host }
    defer { QuickLookView.makeHost = makeHost }
    return QuickLookView(appContext: nil)
  }

  @Test func showsThePreviewOverTheView() {
    let host = FakeHost()
    let view = view(with: host)
    #expect(view.controller == nil)
    #expect(view.subviews.isEmpty)
    view.setURI("file:///tmp/a.pptx")
    #expect(host.url == URL(fileURLWithPath: "/tmp/a.pptx"))

    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    view.frame = CGRect(x: 20, y: 100, width: 200, height: 300)
    screen.view.addSubview(view)
    #expect(host.attachedTo === window)
    // The display link places it from the next frame on.
    #expect(host.shown == nil)
    view.followView()
    #expect(host.shown?.frame == CGRect(x: 20, y: 100, width: 200, height: 300))
    #expect(host.shown?.windowSize == CGSize(width: 320, height: 480))

    view.frame.origin.x = 60
    view.followView()
    #expect(host.shown?.frame == CGRect(x: 60, y: 100, width: 200, height: 300))
  }

  @Test func hidesThePreviewWhileSomethingCoversTheView() {
    let host = FakeHost()
    let view = view(with: host)
    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    view.frame = CGRect(x: 0, y: 0, width: 320, height: 480)
    screen.view.addSubview(view)
    view.followView()
    #expect(host.shown != nil)

    let sheet = UIView(frame: window.bounds)
    screen.view.addSubview(sheet)
    view.followView()
    #expect(host.hidden)
    #expect(view.shownFrame == nil)

    sheet.removeFromSuperview()
    view.followView()
    #expect(!host.hidden)

    view.isHidden = true
    view.followView()
    #expect(host.hidden)
  }

  @Test func leavesOutWhereAWindowAboveDrawsOverTheView() throws {
    let host = FakeHost()
    let view = view(with: host)
    // The test host's scene.
    let scene = try #require(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let (window, screen) = shownWindow(in: scene)
    defer { window.isHidden = true }
    view.frame = CGRect(x: 100, y: 0, width: 220, height: 480)
    screen.view.addSubview(view)
    view.followView()
    #expect(host.shown?.holes == [])

    // An overlay window, like the toast's: a root as big as the window with the toast in it.
    let overlay = UIWindow(windowScene: scene)
    overlay.frame = window.frame
    overlay.windowLevel = window.windowLevel + 1
    let root = UIView(frame: overlay.bounds)
    let toast = UIView(frame: CGRect(x: 40, y: 400, width: 200, height: 40))
    root.addSubview(toast)
    overlay.addSubview(root)
    overlay.isHidden = false
    defer { overlay.isHidden = true }
    view.followView()
    #expect(host.shown?.frame == CGRect(x: 100, y: 0, width: 220, height: 480))
    #expect(host.shown?.holes == [CGRect(x: 100, y: 400, width: 140, height: 40)])

    toast.isHidden = true
    view.followView()
    #expect(host.shown?.holes == [])
  }

  @Test func leavesOutAnOverlayAddedToTheWindow() {
    let host = FakeHost()
    let view = view(with: host)
    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    view.frame = CGRect(x: 100, y: 0, width: 220, height: 480)
    screen.view.addSubview(view)
    // Like react-native-screens' FullWindowOverlay: as big as the window, passing touches through.
    let overlay = UIView(frame: window.bounds)
    overlay.isUserInteractionEnabled = false
    overlay.addSubview(UIView(frame: CGRect(x: 40, y: 400, width: 200, height: 40)))
    window.addSubview(overlay)
    view.followView()
    #expect(host.shown?.holes == [CGRect(x: 100, y: 400, width: 140, height: 40)])
  }

  @Test func removesThePreviewWithTheView() {
    let host = FakeHost()
    let view = view(with: host)
    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    view.frame = CGRect(x: 0, y: 0, width: 100, height: 100)
    screen.view.addSubview(view)
    view.followView()
    #expect(view.shownFrame != nil)
    view.removeFromSuperview()
    #expect(host.detached)
    #expect(view.shownFrame == nil)
  }

  @Test func fallsBackToTheControllerWithoutAnAppKitWindow() throws {
    let host = FakeHost()
    host.canAttach = false
    let view = view(with: host)
    view.setURI("file:///tmp/a.docx")
    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    screen.view.addSubview(view)
    #expect(view.host == nil)
    let controller = try #require(view.controller)
    #expect(controller.parent === screen)
    #expect(view.numberOfPreviewItems(in: controller) == 1)
  }
}

@Suite struct MacPreviewGeometryTests {
  @Test func flipsIntoAnUnflippedView() {
    let frame = MacPreviewGeometry.frame(
      CGRect(x: 10, y: 20, width: 100, height: 50),
      windowSize: CGSize(width: 400, height: 300),
      in: CGRect(x: 0, y: 0, width: 400, height: 300),
      flipped: false
    )
    #expect(frame == CGRect(x: 10, y: 230, width: 100, height: 50))
  }

  @Test func keepsTheOriginInAFlippedView() {
    let frame = MacPreviewGeometry.frame(
      CGRect(x: 10, y: 20, width: 100, height: 50),
      windowSize: CGSize(width: 400, height: 300),
      in: CGRect(x: 0, y: 0, width: 400, height: 300),
      flipped: true
    )
    #expect(frame == CGRect(x: 10, y: 20, width: 100, height: 50))
  }

  @Test func scalesToTheView() {
    let frame = MacPreviewGeometry.frame(
      CGRect(x: 10, y: 20, width: 100, height: 50),
      windowSize: CGSize(width: 400, height: 300),
      in: CGRect(x: 5, y: 0, width: 200, height: 150),
      flipped: true
    )
    #expect(frame == CGRect(x: 10, y: 10, width: 50, height: 25))
  }

  @Test func flattensRectsToNumbersAndBack() {
    let rects = [CGRect(x: 1, y: 2, width: 3, height: 4), CGRect(x: 5, y: 6, width: 7, height: 8)]
    #expect(MacPreviewGeometry.flatten(rects) == [1, 2, 3, 4, 5, 6, 7, 8])
    #expect(MacPreviewGeometry.rects(MacPreviewGeometry.flatten(rects)) == rects)
    #expect(MacPreviewGeometry.rects([]) == [])
  }

  @Test func isEmptyForAnEmptyWindow() {
    let frame = MacPreviewGeometry.frame(
      CGRect(x: 10, y: 20, width: 100, height: 50),
      windowSize: .zero,
      in: CGRect(x: 0, y: 0, width: 400, height: 300),
      flipped: false
    )
    #expect(frame == .zero)
  }
}
