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
    let toast = ToastView(appContext: nil)
    let toastProps = try #require(views["ToastView"]).propsDict()
    try #require(toastProps["cornerRadius"]).set(value: 12.0, onView: toast, appContext: appContext)
    try #require(toastProps["visible"]).set(value: true, onView: toast, appContext: appContext)
    #expect(toast.cornerRadius == 12)
    #expect(toast.visible)

    let symbol = ToastSymbolView(appContext: nil)
    let symbolProps = try #require(views["ToastSymbolView"]).propsDict()
    try #require(symbolProps["name"]).set(value: "checkmark", onView: symbol, appContext: appContext)
    try #require(symbolProps["size"]).set(value: 24.0, onView: symbol, appContext: appContext)
    try #require(symbolProps["color"]).set(value: "green", onView: symbol, appContext: appContext)
    #expect(symbol.name == "checkmark")
    #expect(symbol.size == 24)
    #expect(symbol.imageView.image != nil)
  }

  /// The view that moves, holding the backdrop and the content.
  private func hud(of view: ToastView) -> UIView {
    view.subviews[0]
  }

  private func effectView(of view: ToastView) -> UIVisualEffectView {
    hud(of: view).subviews.compactMap { $0 as? UIVisualEffectView }.first!
  }

  /// Where the React children go.
  private func contentView(of view: ToastView) -> UIView {
    hud(of: view).subviews[1]
  }

  /// The animation starts on the next turn of the main queue.
  private func nextTurn() async {
    await withCheckedContinuation { continuation in
      DispatchQueue.main.async { continuation.resume() }
    }
  }

  @Test func startsHidden() {
    let view = ToastView(appContext: nil)
    view.frame = CGRect(x: 0, y: 0, width: 100, height: 40)
    view.layoutIfNeeded()
    #expect(effectView(of: view).effect == nil)
    #expect(contentView(of: view).alpha == 0)
    #expect(hud(of: view).transform == ToastView.hiddenTransform)
    #expect(hud(of: view).bounds == view.bounds)
    #expect(effectView(of: view).frame == view.bounds)
    #expect(contentView(of: view).frame == view.bounds)
  }

  @Test func animatesTheBackdropContentAndMotionTogether() async {
    let view = ToastView(appContext: nil)
    view.visible = true
    await nextTurn()
    #expect(effectView(of: view).effect != nil)
    #expect(contentView(of: view).alpha == 1)
    #expect(hud(of: view).transform == .identity)

    // Setting the same value again does nothing.
    view.visible = true
    view.visible = false
    await nextTurn()
    #expect(effectView(of: view).effect == nil)
    #expect(contentView(of: view).alpha == 0)
    #expect(hud(of: view).transform == ToastView.hiddenTransform)
  }

  @Test func mountsChildrenOverTheBackdrop() {
    let view = ToastView(appContext: nil)
    let first = UIView()
    let second = UIView()
    view.mountChildComponentView(second, index: 0)
    view.mountChildComponentView(first, index: 0)
    #expect(contentView(of: view).subviews == [first, second])
    view.unmountChildComponentView(first, index: 0)
    #expect(first.superview == nil)
    #expect(contentView(of: view).subviews == [second])
  }

  @Test func usesBlurWithoutGlass() async {
    let view = ToastView(appContext: nil)
    view.usesGlass = false
    view.visible = true
    await nextTurn()
    #expect(effectView(of: view).effect is UIBlurEffect)
  }

  @Test func doesNothingOnceGone() async {
    var view: ToastView? = ToastView(appContext: nil)
    view?.visible = true
    view = nil
    await nextTurn()
  }

  @Test func roundsTheBackdrop() {
    let view = ToastView(appContext: nil)
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
