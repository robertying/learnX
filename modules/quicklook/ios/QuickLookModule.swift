import ExpoModulesCore
import UIKit

/// Quick Look's preview of a downloaded file on the Mac, for the documents its web view can't draw: Office and iWork
/// files, which it shows as raw bytes.
public final class QuickLookModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXQuickLook")

    // Whether the Mac's preview plugin loaded: File detail shows the file's info otherwise.
    Constant("isAvailable") {
      MacPreviewPlugin.isAvailable
    }

    View(QuickLookView.self) {
      Events("onUnavailable")

      Prop("uri") { (view: QuickLookView, uri: String) in
        view.setURI(uri)
      }
    }
  }
}

/// One local file in AppKit's `QLPreviewView`, from the Mac app's MacPreview plugin, placed in the window over this
/// view: Mac Catalyst's own `QLPreviewController` shows only a low-resolution thumbnail of the first page. Without
/// the plugin, or a window to put the preview in, it sends `onUnavailable` and File detail shows the file's info.
final class QuickLookView: ExpoView {
  /// Makes the Mac's preview host, or nil where there is none. Tests replace it.
  static var makeHost: @MainActor () -> (any MacPreviewHosting)? = MacPreviewPlugin.makeHost

  let onUnavailable = EventDispatcher()
  private(set) var url: URL?
  private(set) var host: (any MacPreviewHosting)?
  /// Whether it found no preview to show (sent `onUnavailable`).
  private(set) var isUnavailable = false
  /// The frame the host shows the preview at, in window coordinates; nil while it is hidden.
  private(set) var shownFrame: CGRect?
  /// The parts of `shownFrame` that windows above draw over.
  private(set) var shownHoles: [CGRect] = []
  private var displayLink: CADisplayLink?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    host = Self.makeHost()
  }

  /// A `file:` URI; anything else shows nothing.
  func setURI(_ uri: String) {
    let newURL = URL(string: uri).flatMap { $0.isFileURL ? $0 : nil }
    guard newURL != url else {
      return
    }
    url = newURL
    host?.setURL(newURL)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard let window else {
      stopFollowing()
      host?.detach()
      return
    }
    guard let host, host.attach(toWindowOf: window) else {
      unavailable()
      return
    }
    host.setURL(url)
    startFollowing()
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

  private func unavailable() {
    guard !isUnavailable else {
      return
    }
    isUnavailable = true
    onUnavailable()
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

/// Loads the Mac's preview plugin (`MacPreview.bundle` in the app's PlugIns, built from `ios/MacPreview`).
enum MacPreviewPlugin {
  private static let hostClass: NSObject.Type? = {
    #if targetEnvironment(macCatalyst)
      guard let url = Bundle.main.builtInPlugInsURL?.appendingPathComponent("MacPreview.bundle"),
        let bundle = Bundle(url: url),
        bundle.load(),
        let hostClass = bundle.principalClass as? NSObject.Type,
        hostClass.conforms(to: MacPreviewHosting.self)
      else {
        return nil
      }
      return hostClass
    #else
      return nil
    #endif
  }()

  /// Whether the plugin loaded and makes hosts.
  static var isAvailable: Bool {
    hostClass != nil
  }

  @MainActor static func makeHost() -> (any MacPreviewHosting)? {
    hostClass?.init() as? any MacPreviewHosting
  }
}
