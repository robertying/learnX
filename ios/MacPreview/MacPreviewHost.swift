import AppKit
import Quartz

/// The Mac's Quick Look preview for `QuickLookView` (modules/quicklook): AppKit's `QLPreviewView`, sharp and
/// scrollable through every page, where Mac Catalyst's `QLPreviewController` shows only a low-resolution thumbnail of
/// the first page. This bundle's principal class; the Mac app loads it from its PlugIns.
@objc(LXMacPreviewHost)
final class MacPreviewHost: NSObject, MacPreviewHosting {
  private weak var window: NSWindow?
  private var preview: QLPreviewView?
  private var url: URL?

  func attach(toWindowOf uiWindow: AnyObject) -> Bool {
    window = Self.window(showing: uiWindow)
    return window != nil
  }

  func setURL(_ url: URL?) {
    self.url = url
    preview?.previewItem = url as NSURL?
  }

  func show(frame: CGRect, windowSize: CGSize, holes: [Double]) {
    guard let contentView = window?.contentView else {
      return
    }
    let preview = preview ?? makePreview()
    // Above the views that draw the UIKit content, which can be added after it.
    if contentView.subviews.last !== preview {
      contentView.addSubview(preview, positioned: .above, relativeTo: nil)
    }
    let toContentView = { (rect: CGRect) in
      MacPreviewGeometry.frame(rect, windowSize: windowSize, in: contentView.bounds, flipped: contentView.isFlipped)
    }
    preview.frame = toContentView(frame)
    preview.isHidden = false
    let covered = MacPreviewGeometry.rects(holes).map { preview.convert(toContentView($0), from: contentView) }
    mask(preview, leavingOut: covered)
  }

  func hide() {
    preview?.isHidden = true
  }

  func togglePanel(for url: URL) {
    PanelController.shared.toggle(url)
  }

  func detach() {
    preview?.close()
    preview?.removeFromSuperview()
    preview = nil
    window = nil
  }

  /// Masks `preview` so that what is under `holes` (in its coordinates) shows through.
  private func mask(_ preview: QLPreviewView, leavingOut holes: [CGRect]) {
    guard !holes.isEmpty, let layer = preview.layer else {
      preview.layer?.mask = nil
      return
    }
    let path = CGMutablePath()
    path.addRect(preview.bounds)
    for hole in holes {
      // The view's and its layer's coordinates match unless only one of them is flipped.
      let y = preview.isFlipped == layer.isGeometryFlipped ? hole.minY : preview.bounds.height - hole.maxY
      path.addRect(CGRect(x: hole.minX, y: y, width: hole.width, height: hole.height))
    }
    let mask = CAShapeLayer()
    mask.frame = preview.bounds
    mask.path = path
    mask.fillRule = .evenOdd
    layer.mask = mask
  }

  private func makePreview() -> QLPreviewView {
    let preview = QLPreviewView(frame: .zero, style: .normal)!
    preview.shouldCloseWithWindow = false
    preview.autostarts = true
    preview.previewItem = url as NSURL?
    self.preview = preview
    return preview
  }

  /// The `NSWindow` that shows `uiWindow`: Mac Catalyst's windows list the `UIWindow`s they show as `uiWindows`.
  private static func window(showing uiWindow: AnyObject) -> NSWindow? {
    let key = "uiWindows"
    return NSApp.windows.first { window in
      guard window.responds(to: NSSelectorFromString(key)),
        let uiWindows = window.value(forKey: key) as? [AnyObject]
      else {
        return false
      }
      return uiWindows.contains { $0 === uiWindow }
    }
  }
}

/// Quick Look's floating panel, as Space opens it in Finder. The panel asks the responder chain of the key window for
/// a controller, which supplies its items: this one joins the chain after the window.
@MainActor
private final class PanelController: NSResponder, QLPreviewPanelDataSource {
  static let shared = PanelController()

  private var url: URL?

  func toggle(_ url: URL) {
    guard let panel = QLPreviewPanel.shared() else {
      return
    }
    if panel.isVisible, url == self.url {
      panel.orderOut(nil)
      return
    }
    self.url = url
    if let window = NSApp.keyWindow ?? NSApp.mainWindow, window !== panel, !isInChain(of: window) {
      nextResponder = window.nextResponder
      window.nextResponder = self
    }
    panel.updateController()
    if (panel.currentController as AnyObject?) === self {
      panel.reloadData()
    }
    panel.makeKeyAndOrderFront(nil)
  }

  private func isInChain(of window: NSWindow) -> Bool {
    var responder: NSResponder? = window
    while let current = responder {
      if current === self {
        return true
      }
      responder = current.nextResponder
    }
    return false
  }

  override func acceptsPreviewPanelControl(_ panel: QLPreviewPanel!) -> Bool {
    true
  }

  override func beginPreviewPanelControl(_ panel: QLPreviewPanel!) {
    MainActor.assumeIsolated {
      panel.dataSource = self
    }
  }

  override func endPreviewPanelControl(_ panel: QLPreviewPanel!) {
    MainActor.assumeIsolated {
      panel.dataSource = nil
    }
  }

  nonisolated func numberOfPreviewItems(in panel: QLPreviewPanel!) -> Int {
    MainActor.assumeIsolated { url == nil ? 0 : 1 }
  }

  nonisolated func previewPanel(_ panel: QLPreviewPanel!, previewItemAt index: Int) -> (any QLPreviewItem)! {
    MainActor.assumeIsolated { url as NSURL? }
  }
}
