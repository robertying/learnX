@testable import ExpoModulesCore
import Testing
import UIKit

@testable import LearnXToast

@MainActor
@Suite struct ToastViewsTests {
  @Test func definesItsViews() {
    _ = ToastModule(appContext: AppContext()).definition()
  }

  @Test func takesItsPropsFromJS() throws {
    let appContext = AppContext()
    let views = ToastModule(appContext: appContext).definition().views
    let background = ToastBackgroundView(appContext: nil)
    let backgroundProps = try #require(views["ToastBackgroundView"]).propsDict()
    try #require(backgroundProps["cornerRadius"]).set(value: 12.0, onView: background, appContext: appContext)
    try #require(backgroundProps["visible"]).set(value: true, onView: background, appContext: appContext)
    #expect(background.cornerRadius == 12)
    #expect(background.visible)

    let symbol = ToastSymbolView(appContext: nil)
    let symbolProps = try #require(views["ToastSymbolView"]).propsDict()
    try #require(symbolProps["name"]).set(value: "checkmark", onView: symbol, appContext: appContext)
    try #require(symbolProps["size"]).set(value: 24.0, onView: symbol, appContext: appContext)
    try #require(symbolProps["color"]).set(value: "green", onView: symbol, appContext: appContext)
    #expect(symbol.name == "checkmark")
    #expect(symbol.size == 24)
    #expect(symbol.imageView.image != nil)
  }

  private func effectView(of view: ToastBackgroundView) -> UIVisualEffectView {
    view.subviews.compactMap { $0 as? UIVisualEffectView }.first!
  }

  /// The fade runs on the next turn of the main queue.
  private func nextTurn() async {
    await withCheckedContinuation { continuation in
      DispatchQueue.main.async { continuation.resume() }
    }
  }

  @Test func fadesTheBackgroundInAndOut() async {
    let view = ToastBackgroundView(appContext: nil)
    view.frame = CGRect(x: 0, y: 0, width: 100, height: 40)
    view.layoutIfNeeded()
    #expect(!view.isUserInteractionEnabled)
    #expect(effectView(of: view).frame == view.bounds)

    view.visible = true
    await nextTurn()
    #expect(effectView(of: view).effect != nil)

    // Setting the same value again does nothing.
    view.visible = true
    view.visible = false
    await nextTurn()
    #expect(effectView(of: view).effect == nil)
  }

  @Test func usesBlurWithoutGlass() async {
    let view = ToastBackgroundView(appContext: nil)
    view.usesGlass = false
    view.visible = true
    await nextTurn()
    #expect(effectView(of: view).effect is UIBlurEffect)
  }

  @Test func doesNothingOnceGone() async {
    var view: ToastBackgroundView? = ToastBackgroundView(appContext: nil)
    view?.visible = true
    view = nil
    await nextTurn()
  }

  @Test func roundsTheBackground() {
    let view = ToastBackgroundView(appContext: nil)
    view.cornerRadius = 12
    #expect(effectView(of: view).layer.cornerRadius == 12)
    #expect(effectView(of: view).layer.cornerCurve == .continuous)
  }

  @Test func showsASymbol() {
    let view = ToastSymbolView(appContext: nil)
    view.frame = CGRect(x: 0, y: 0, width: 30, height: 30)
    view.layoutIfNeeded()
    #expect(!view.isUserInteractionEnabled)
    #expect(view.imageView.frame == view.bounds)

    view.name = "checkmark"
    let small = view.imageView.image
    #expect(small != nil)
    view.size = 40
    #expect(view.imageView.image != nil)
    #expect(view.imageView.image != small)

    view.imageView.tintColor = .systemGreen
    #expect(view.imageView.tintColor == .systemGreen)
  }
}
