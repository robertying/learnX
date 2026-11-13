import PDFKit
import Testing
import UIKit

/// What patches/react-native-pdf@7.0.5.patch changes on iOS: when the view resizes, the page is fitted to the new
/// size. The scale factor used to be set before its limits, so shrinking held it at the old minimum.
@MainActor
@Suite struct PdfPatchTests {
  private let pageWidth: CGFloat = 200

  private func document() throws -> URL {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("PdfPatchTests.pdf")
    let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: pageWidth, height: 300))
    try renderer.writePDF(to: url) { context in
      context.beginPage()
    }
    return url
  }

  /// RNPDFPdfView's props are Objective-C properties; React sets them, then sends the names that changed.
  private func pdfView(width: CGFloat, url: URL) throws -> UIView {
    let viewClass = try #require(NSClassFromString("RNPDFPdfView") as? UIView.Type)
    let view = viewClass.init(frame: CGRect(x: 0, y: 0, width: width, height: 800))
    view.setValue(url.path, forKey: "path")
    view.setValue(1, forKey: "scale")
    view.setValue(1, forKey: "minScale")
    view.setValue(3, forKey: "maxScale")
    view.setValue(0, forKey: "fitPolicy")
    resize(view, width: width, changed: ["path", "scale", "minScale", "maxScale", "fitPolicy"])
    return view
  }

  /// What a layout update does (`updateLayoutMetrics:oldLayoutMetrics:`): resize, then apply the changed props.
  private func resize(_ view: UIView, width: CGFloat, changed: [String]) {
    view.frame.size.width = width
    pdfKitView(in: view)?.frame = view.bounds
    view.perform(NSSelectorFromString("didSetProps:"), with: changed)
  }

  private func pdfKitView(in view: UIView) -> PDFView? {
    view.subviews.lazy.compactMap { $0 as? PDFView }.first
  }

  @Test func fitsThePageWhenTheViewShrinks() throws {
    let view = try pdfView(width: 800, url: try document())
    let pdf = try #require(pdfKitView(in: view))
    #expect(abs(pdf.scaleFactor - 800 / pageWidth) < 0.01)

    resize(view, width: 400, changed: ["scale", "minScale", "maxScale", "fitPolicy"])
    #expect(abs(pdf.scaleFactor - 400 / pageWidth) < 0.01)
    #expect(abs(pdf.minScaleFactor - 400 / pageWidth) < 0.01)
  }

  @Test func fitsThePageWhenTheViewGrows() throws {
    let view = try pdfView(width: 400, url: try document())
    let pdf = try #require(pdfKitView(in: view))
    resize(view, width: 800, changed: ["scale", "minScale", "maxScale", "fitPolicy"])
    #expect(abs(pdf.scaleFactor - 800 / pageWidth) < 0.01)
  }
}
