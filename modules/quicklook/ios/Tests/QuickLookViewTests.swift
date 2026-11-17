@testable import ExpoModulesCore
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
private final class FakeHost: NSObject, MacPreviewHosting {
  var canAttach = true
  var attachedTo: AnyObject?
  var url: URL?
  var shown: (frame: CGRect, windowSize: CGSize, holes: [CGRect])?
  var hidden = false
  var detached = false
  var panelURLs: [URL] = []

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

  func togglePanel(for url: URL) {
    panelURLs.append(url)
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

  @Test func isUnavailableWithoutAnAppKitWindow() {
    let host = FakeHost()
    host.canAttach = false
    let view = view(with: host)
    #expect(!view.isUnavailable)
    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    screen.view.addSubview(view)
    #expect(view.isUnavailable)
    view.followView()
    #expect(host.shown == nil)
  }

  @Test func isUnavailableWithoutThePlugin() {
    let makeHost = QuickLookView.makeHost
    QuickLookView.makeHost = { nil }
    defer { QuickLookView.makeHost = makeHost }
    let view = QuickLookView(appContext: nil)
    view.setURI("file:///tmp/a.docx")
    #expect(view.url == URL(fileURLWithPath: "/tmp/a.docx"))
    let (window, screen) = shownWindow()
    defer { window.isHidden = true }
    screen.view.addSubview(view)
    #expect(view.isUnavailable)
  }

  @Test func takesTheFileFromJS() throws {
    let host = FakeHost()
    let view = view(with: host)
    let appContext = AppContext()
    let views = QuickLookModule(appContext: appContext).definition().views
    let props = try #require(views["QuickLookView"]).propsDict()
    try #require(props["uri"]).set(value: "file:///tmp/a.docx", onView: view, appContext: appContext)
    #expect(host.url == URL(fileURLWithPath: "/tmp/a.docx"))
    // A web address shows nothing.
    view.setURI("https://example.com/a.docx")
    #expect(host.url == nil)
  }

  @Test func hasNoPluginOutsideTheMac() {
    #expect(!MacPreviewPlugin.isAvailable)
    #expect(MacPreviewPlugin.makeHost() == nil)
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

@MainActor
@Suite(.serialized) struct QuickLookPanelTests {
  @Test func togglesThePanelForAFile() {
    let host = FakeHost()
    let makeHost = QuickLookView.makeHost
    QuickLookView.makeHost = { host }
    QuickLookPanel.reset()
    defer {
      QuickLookView.makeHost = makeHost
      QuickLookPanel.reset()
    }
    QuickLookPanel.toggle("file:///tmp/a.docx")
    QuickLookPanel.toggle("https://example.com/a.docx")
    QuickLookPanel.toggle("file:///tmp/b.pptx")
    #expect(host.panelURLs == [URL(fileURLWithPath: "/tmp/a.docx"), URL(fileURLWithPath: "/tmp/b.pptx")])
  }

  @Test func doesNothingWithoutThePlugin() {
    QuickLookPanel.reset()
    let makeHost = QuickLookView.makeHost
    QuickLookView.makeHost = { nil }
    defer {
      QuickLookView.makeHost = makeHost
      QuickLookPanel.reset()
    }
    QuickLookPanel.toggle("file:///tmp/a.docx")
  }

  @Test func isAFunctionOfTheModule() {
    let functions = QuickLookModule(appContext: AppContext()).definition().functions
    #expect(functions["showQuickLookPanel"] != nil)
  }
}
