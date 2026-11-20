@testable import ExpoModulesCore
import PDFKit
import Testing
import UIKit

@testable import LearnXPdf

@MainActor
@Suite struct PdfViewTests {
  private let pageWidth: CGFloat = 200

  private func document(name: String = "PdfViewTests.pdf", pages: Int = 3) throws -> URL {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
    let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: pageWidth, height: 300))
    try renderer.writePDF(to: url) { context in
      for _ in 0..<pages {
        context.beginPage()
      }
    }
    return url
  }

  /// A view laid out at `width`, showing `url`, as File detail sets it.
  private func pdfView(width: CGFloat, url: URL) -> PdfView {
    let view = PdfView(appContext: nil)
    view.setURI(url.absoluteString)
    resize(view, width: width)
    return view
  }

  private func resize(_ view: PdfView, width: CGFloat) {
    view.frame = CGRect(x: 0, y: 0, width: width, height: 800)
    view.layoutIfNeeded()
  }

  private func isClose(_ value: CGFloat, _ expected: CGFloat) -> Bool {
    abs(value - expected) < 0.01
  }

  /// The pages fill the width at `width`, give or take the margins PDFView leaves around them.
  private func fitsWidth(_ view: PdfView, _ width: CGFloat) -> Bool {
    let fit = view.pdfView.scaleFactorForSizeToFit
    return isClose(view.fittedScale ?? 0, fit) && abs(fit - width / pageWidth) < width / pageWidth * 0.06
  }

  @Test func definesItsView() {
    _ = PdfModule(appContext: AppContext()).definition()
  }

  /// JS sets the file as a string; the view takes it.
  @Test func takesTheURIFromJS() throws {
    let url = try document()
    let view = PdfView(appContext: nil)
    let prop = try #require(
      PdfModule(appContext: AppContext()).definition().views["PdfView"]?.propsDict()["uri"])
    try prop.set(value: url.absoluteString, onView: view, appContext: AppContext())
    #expect(view.url == url)
    #expect(view.pdfView.document != nil)
  }

  @Test func fitsTheFirstPageToTheWidth() throws {
    let view = pdfView(width: 400, url: try document())
    let fit = try #require(view.fittedScale)
    #expect(fitsWidth(view, 400))
    #expect(isClose(view.pdfView.scaleFactor, fit))
    #expect(isClose(view.pdfView.minScaleFactor, fit))
    #expect(isClose(view.pdfView.maxScaleFactor, fit * PdfView.maxZoom))
  }

  /// PDFView clamps the scale factor to its old limits, so shrinking needs the limits lowered first.
  @Test func fitsThePageWhenTheViewShrinks() throws {
    let view = pdfView(width: 800, url: try document())
    resize(view, width: 400)
    let fit = try #require(view.fittedScale)
    #expect(fitsWidth(view, 400))
    #expect(isClose(view.pdfView.scaleFactor, fit))
    #expect(isClose(view.pdfView.minScaleFactor, fit))
  }

  /// More than the maximum zoom at once, like a Mac window made wider.
  @Test func fitsThePageWhenTheViewGrows() throws {
    let view = pdfView(width: 200, url: try document())
    resize(view, width: 800)
    #expect(fitsWidth(view, 800))
    #expect(isClose(view.pdfView.scaleFactor, try #require(view.fittedScale)))
  }

  @Test func keepsTheZoomWhenTheViewResizes() throws {
    let view = pdfView(width: 400, url: try document())
    view.pdfView.scaleFactor = try #require(view.fittedScale) * 2
    #expect(isClose(view.zoom, 2))

    resize(view, width: 600)
    #expect(fitsWidth(view, 600))
    #expect(isClose(view.pdfView.scaleFactor, try #require(view.fittedScale) * 2))
    #expect(isClose(view.zoom, 2))
  }

  @Test func opensAnotherFileAtTheWidth() throws {
    let view = pdfView(width: 400, url: try document())
    view.pdfView.scaleFactor = try #require(view.fittedScale) * 2
    view.setURI(try document(name: "PdfViewTests-other.pdf").absoluteString)
    view.layoutIfNeeded()
    #expect(isClose(view.zoom, 1))
    #expect(isClose(view.pdfView.scaleFactor, try #require(view.fittedScale)))
  }

  @Test func opensBelowTheTopInset() async throws {
    let view = pdfView(width: 400, url: try document())
    let scrollView = try #require(view.pdfView.subviews.lazy.compactMap { $0 as? UIScrollView }.first)
    // What a translucent header gives it in the app, as a safe area inset.
    scrollView.contentInsetAdjustmentBehavior = .never
    scrollView.contentInset.top = 100

    // The view goes to the first page once the main queue gets to it.
    try await Task.sleep(for: .milliseconds(200))
    #expect(scrollView.contentOffset.y == -100)
  }

  @Test func failsOnAFileThatIsNotAPDF() throws {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("PdfViewTests.txt")
    try Data("not a pdf".utf8).write(to: url)
    let view = pdfView(width: 400, url: url)
    #expect(view.failure == .unreadable)
    #expect(view.pdfView.document == nil)
  }

  @Test func failsOnALockedPDF() throws {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("PdfViewTests-locked.pdf")
    let renderer = UIGraphicsPDFRenderer(
      bounds: CGRect(x: 0, y: 0, width: pageWidth, height: 300),
      format: {
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
          kCGPDFContextUserPassword as String: "secret", kCGPDFContextOwnerPassword as String: "secret",
        ]
        return format
      }())
    try renderer.writePDF(to: url) { context in
      context.beginPage()
    }
    let view = pdfView(width: 400, url: url)
    #expect(view.failure == .password)
    #expect(view.pdfView.document == nil)
  }

  @Test func showsNothingForAURIThatIsNotAFile() throws {
    let view = pdfView(width: 400, url: try document())
    view.setURI("https://example.com/a.pdf")
    #expect(view.url == nil)
    #expect(view.pdfView.document == nil)
    #expect(view.failure == nil)
  }
}
