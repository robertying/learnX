import ObjectiveC
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

  /// RNPDFPdfView's props are Objective-C properties. React sets them and sends the names that changed, which the
  /// view keeps until its first frame. FileDetail's `<Pdf source={…} fitPolicy={0} />` changes only these two: the
  /// scale (1) and its limits (1 to 3) are the view's defaults.
  private func pdfView(width: CGFloat, url: URL) throws -> UIView {
    let viewClass = try #require(NSClassFromString("RNPDFPdfView") as? UIView.Type)
    let view = viewClass.init(frame: .zero)
    view.setValue(url.path, forKey: "path")
    view.setValue(0, forKey: "fitPolicy")
    view.perform(NSSelectorFromString("didSetProps:"), with: ["path", "fitPolicy"])
    resize(view, width: width)
    return view
  }

  /// What a layout update does (`reactSetFrame:`, like Fabric's `updateLayoutMetrics:oldLayoutMetrics:`): resize,
  /// then apply the props the view kept again.
  private func resize(_ view: UIView, width: CGFloat) {
    typealias SetFrame = @convention(c) (AnyObject, Selector, CGRect) -> Void
    let selector = NSSelectorFromString("reactSetFrame:")
    let setFrame = unsafeBitCast(class_getMethodImplementation(type(of: view), selector), to: SetFrame.self)
    setFrame(view, selector, CGRect(x: 0, y: 0, width: width, height: 800))
  }

  private func pdfKitView(in view: UIView) -> PDFView? {
    view.subviews.lazy.compactMap { $0 as? PDFView }.first
  }

  @Test func fitsThePageWhenTheViewShrinks() throws {
    let view = try pdfView(width: 800, url: try document())
    let pdf = try #require(pdfKitView(in: view))
    #expect(abs(pdf.scaleFactor - 800 / pageWidth) < 0.01)

    resize(view, width: 400)
    #expect(abs(pdf.scaleFactor - 400 / pageWidth) < 0.01)
    #expect(abs(pdf.minScaleFactor - 400 / pageWidth) < 0.01)
  }

  /// More than the maximum scale (3) at once, like a Mac window made wider.
  @Test func fitsThePageWhenTheViewGrows() throws {
    let view = try pdfView(width: 200, url: try document())
    let pdf = try #require(pdfKitView(in: view))
    resize(view, width: 800)
    #expect(abs(pdf.scaleFactor - 800 / pageWidth) < 0.01)
  }
}
