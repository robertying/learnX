import ExpoModulesCore
import PDFKit
import UIKit

/// PDFKit's view of a downloaded PDF, for File detail.
public final class PdfModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXPdf")

    View(PdfView.self) {
      Events("onError")

      Prop("uri") { (view: PdfView, uri: String) in
        view.setURI(uri)
      }
    }
  }
}

/// Why a PDF didn't open, as `onError`'s `reason` says it.
enum PdfFailure: String {
  /// It is encrypted with a password.
  case password
  /// It is damaged or isn't a PDF.
  case unreadable
}

/// One local PDF in PDFKit's `PDFView`, its pages one under another and fitted to the view's width. The person can
/// zoom in from there; resizing the view (rotating, a Mac window or an iPad split) fits the pages to the new width
/// and keeps how far they zoomed in. A document opens at the top of the scroll view's content inset, so a
/// translucent header doesn't cover the first page.
final class PdfView: ExpoView {
  /// How far past fitting the width a person can zoom in.
  static let maxZoom: CGFloat = 3

  let onError = EventDispatcher()
  let pdfView = PDFView()
  private(set) var url: URL?
  /// Why the document didn't open, as sent to `onError`.
  private(set) var failure: PdfFailure?
  /// The scale factor that fits the pages' width, for the width it was last fitted to.
  private(set) var fittedScale: CGFloat?
  /// The scale over fitting the width, which resizing keeps.
  private(set) var zoom: CGFloat = 1
  private var isFitting = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    pdfView.autoScales = false
    pdfView.frame = bounds
    pdfView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(pdfView)
    NotificationCenter.default.addObserver(
      self, selector: #selector(scaleChanged), name: .PDFViewScaleChanged, object: pdfView)
  }

  /// A `file:` URI; anything else shows nothing.
  func setURI(_ uri: String) {
    let newURL = URL(string: uri).flatMap { $0.isFileURL ? $0 : nil }
    guard newURL != url else {
      return
    }
    url = newURL
    open()
  }

  private func open() {
    pdfView.document = nil
    fittedScale = nil
    zoom = 1
    failure = nil
    guard let url else {
      return
    }
    guard let document = PDFDocument(url: url) else {
      fail(.unreadable)
      return
    }
    guard !document.isLocked else {
      fail(.password)
      return
    }
    pdfView.document = document
    setNeedsLayout()
  }

  private func fail(_ failure: PdfFailure) {
    self.failure = failure
    onError(["reason": failure.rawValue])
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    fitWidth()
  }

  /// Fits the pages to the view's width, times the zoom the person chose.
  private func fitWidth() {
    guard pdfView.document != nil, bounds.width > 0 else {
      return
    }
    // PDFView's own fit, which leaves room for the margins around its pages.
    pdfView.layoutIfNeeded()
    let scale = pdfView.scaleFactorForSizeToFit
    guard scale > 0, scale != fittedScale else {
      return
    }
    let isOpening = fittedScale == nil
    fittedScale = scale
    isFitting = true
    // The limits go first: PDFView clamps the scale factor to them, so when the view shrinks, the new scale factor
    // would otherwise be held at the old minimum.
    pdfView.minScaleFactor = scale
    pdfView.maxScaleFactor = scale * Self.maxZoom
    pdfView.scaleFactor = scale * zoom
    isFitting = false
    if isOpening {
      // PDFView goes to the first page once the main queue gets to it, at the top of its content, under the inset.
      DispatchQueue.main.async { [weak self] in
        self?.scrollToTop()
      }
    }
  }

  func scrollToTop() {
    guard let scrollView = pdfView.subviews.lazy.compactMap({ $0 as? UIScrollView }).first else {
      return
    }
    let inset = scrollView.adjustedContentInset
    scrollView.setContentOffset(CGPoint(x: -inset.left, y: -inset.top), animated: false)
  }

  /// The person zoomed: keep it, as a scale over fitting the width.
  @objc private func scaleChanged() {
    guard !isFitting, let fittedScale else {
      return
    }
    zoom = pdfView.scaleFactor / fittedScale
  }
}
