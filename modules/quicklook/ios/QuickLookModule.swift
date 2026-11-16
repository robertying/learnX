import ExpoModulesCore
import QuickLook
import UIKit

/// Quick Look's preview of a downloaded file, for the documents the Mac's web view can't draw: Office and iWork files,
/// which it shows as raw bytes.
public final class QuickLookModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXQuickLook")

    View(QuickLookView.self) {
      Prop("uri") { (view: QuickLookView, uri: String) in
        view.setURI(uri)
      }
    }
  }
}

/// One local file in Quick Look. On the Mac that is AppKit's `QLPreviewView`, from the app's MacPreview plugin, placed
/// in the window over this view: Mac Catalyst's `QLPreviewController` shows only a low-resolution thumbnail of the
/// first page. Without the plugin (iOS, or if it doesn't load) it is a `QLPreviewController`, as a child of the view
/// controller the view is in, so that it gets its appearance calls.
final class QuickLookView: ExpoView {
  /// Makes the Mac's preview host, or nil where there is none. Tests replace it.
  static var makeHost: @MainActor () -> (any MacPreviewHosting)? = MacPreviewPlugin.makeHost

  private(set) var url: URL?
  private(set) var host: (any MacPreviewHosting)?
  private(set) var controller: QLPreviewController?
  /// The frame the host shows the preview at, in window coordinates; nil while it is hidden.
  private(set) var shownFrame: CGRect?
  /// The parts of `shownFrame` that windows above draw over.
  private(set) var shownHoles: [CGRect] = []
  private var displayLink: CADisplayLink?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    host = Self.makeHost()
    if host == nil {
      embedController()
    }
  }

  /// A `file:` URI; anything else shows nothing.
  func setURI(_ uri: String) {
    let newURL = URL(string: uri).flatMap { $0.isFileURL ? $0 : nil }
    guard newURL != url else {
      return
    }
    url = newURL
    host?.setURL(newURL)
    controller?.reloadData()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let host {
      if let window, host.attach(toWindowOf: window) {
        host.setURL(url)
        startFollowing()
        return
      }
      stopFollowing()
      host.detach()
      if window != nil {
        // No AppKit window to put the preview in.
        self.host = nil
        embedController()
      } else {
        return
      }
    }
    guard let controller else {
      return
    }
    if window != nil {
      guard controller.parent == nil, let parent = enclosingViewController else {
        return
      }
      parent.addChild(controller)
      controller.didMove(toParent: parent)
      // Joining a screen that is already on its way in skips the controller's appearance calls, without which
      // Quick Look never loads the preview.
      controller.beginAppearanceTransition(true, animated: false)
      controller.endAppearanceTransition()
    } else if controller.parent != nil {
      controller.beginAppearanceTransition(false, animated: false)
      controller.endAppearanceTransition()
      controller.willMove(toParent: nil)
      controller.removeFromParent()
    }
  }

  /// Puts the host's preview where this view is in the window, or hides it while something covers the view (a
  /// sheet, a screen pushed over it) or the view itself is hidden. Windows above it in the scene (a toast) draw into
  /// the same `NSWindow`, under the preview, so the preview leaves out where they draw over the view. Runs every frame
  /// while in a window, since the view moves without being laid out (the sidebar collapsing, the split view or the
  /// window resizing).
  func followView() {
    guard let host, let window else {
      return
    }
    let frame = convert(bounds, to: window)
    let center = CGPoint(x: frame.midX, y: frame.midY)
    let covered = window.hitTest(center, with: nil).map { !$0.isDescendant(of: self) } ?? true
    let target = frame.isEmpty || covered ? nil : frame
    let holes = target.map { overlaps(of: $0, in: window) } ?? []
    guard target != shownFrame || holes != shownHoles else {
      return
    }
    shownFrame = target
    shownHoles = holes
    if let target {
      host.show(frame: target, windowSize: window.bounds.size, holes: MacPreviewGeometry.flatten(holes))
    } else {
      host.hide()
    }
  }

  /// Where views drawn above this one overlap `frame`, in `window`'s coordinates: the window's subviews after the one
  /// this view is in (an overlay added to the window), and the windows above `window` in its scene (an overlay's own
  /// window). Views as big as their window are containers (an overlay's root): their subviews are what draws.
  private func overlaps(of frame: CGRect, in window: UIWindow) -> [CGRect] {
    let windowArea = window.bounds.width * window.bounds.height
    var rects: [CGRect] = []
    func collect(_ view: UIView) {
      guard !view.isHidden, view.alpha > 0.01 else {
        return
      }
      let rect = view.convert(view.bounds, to: window.coordinateSpace)
      if rect.width * rect.height >= windowArea * 0.9 {
        view.subviews.forEach(collect)
      } else if rect.intersects(frame) {
        rects.append(rect.intersection(frame))
      }
    }
    if let mine = window.subviews.firstIndex(where: { isDescendant(of: $0) }) {
      window.subviews[(mine + 1)...].forEach(collect)
    }
    let windows = window.windowScene?.windows ?? []
    let order = windows.firstIndex { $0 === window } ?? 0
    for (index, other) in windows.enumerated() where other !== window && !other.isHidden {
      // Of windows at the same level, the later ones in the scene are above.
      if other.windowLevel > window.windowLevel || (other.windowLevel == window.windowLevel && index > order) {
        collect(other)
      }
    }
    return rects
  }

  /// From the next frame on: the view joins the window before React lays it out.
  private func startFollowing() {
    shownFrame = nil
    shownHoles = []
    guard displayLink == nil else {
      return
    }
    let displayLink = CADisplayLink(target: DisplayLinkTarget(view: self), selector: #selector(DisplayLinkTarget.tick))
    displayLink.add(to: .main, forMode: .common)
    self.displayLink = displayLink
  }

  private func stopFollowing() {
    displayLink?.invalidate()
    displayLink = nil
    shownFrame = nil
    shownHoles = []
  }

  private func embedController() {
    let controller = QLPreviewController()
    controller.dataSource = self
    controller.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    controller.view.frame = bounds
    addSubview(controller.view)
    self.controller = controller
  }

  /// The nearest view controller up the responder chain: the screen this view is in.
  private var enclosingViewController: UIViewController? {
    var responder = next
    while let current = responder {
      if let viewController = current as? UIViewController {
        return viewController
      }
      responder = current.next
    }
    return nil
  }
}

/// The display link's target, which holds the view weakly: a display link keeps its target. It runs on the main run
/// loop.
@MainActor
private final class DisplayLinkTarget: NSObject {
  weak var view: QuickLookView?

  init(view: QuickLookView) {
    self.view = view
  }

  @objc func tick() {
    view?.followView()
  }
}

extension QuickLookView: QLPreviewControllerDataSource {
  func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    url == nil ? 0 : 1
  }

  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> any QLPreviewItem {
    // Only asked for when there is one.
    url! as NSURL
  }
}

/// Loads the Mac's preview plugin (`MacPreview.bundle` in the app's PlugIns, built from `ios/MacPreview`).
enum MacPreviewPlugin {
  private static let hostClass: NSObject.Type? = {
    #if targetEnvironment(macCatalyst)
      guard let url = Bundle.main.builtInPlugInsURL?.appendingPathComponent("MacPreview.bundle"),
        let bundle = Bundle(url: url),
        bundle.load()
      else {
        return nil
      }
      return bundle.principalClass as? NSObject.Type
    #else
      return nil
    #endif
  }()

  @MainActor static func makeHost() -> (any MacPreviewHosting)? {
    hostClass?.init() as? any MacPreviewHosting
  }
}
