import ExpoModulesCore
import UIKit

/// UIKit views for the toast HUD. The toast draws in react-native-screens' `FullWindowOverlay`, a plain subview of
/// the window with no view controller above it, where SwiftUI hosts (@expo/ui) refuse to render.
public final class ToastModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXToast")

    // Where the tab bar is, so the toast keeps clear of it wherever UIKit put it.
    // In the toast's own window when there are several (iPad, Mac).
    AsyncFunction("tabBarFrame") { (windowId: String?) -> [String: Double]? in
      MainActor.assumeIsolated {
        TabBarLocator.frame(windowId: windowId)
      }
    }.runOnQueue(.main)

    View(ToastView.self) {
      Events("onHidden")

      Prop("cornerRadius") { (view: ToastView, radius: Double) in
        view.cornerRadius = radius
      }
      Prop("visible") { (view: ToastView, visible: Bool) in
        view.visible = visible
      }
    }

    View(ToastSymbolView.self) {
      Prop("name") { (view: ToastSymbolView, name: String) in
        view.name = name
      }
      Prop("size") { (view: ToastSymbolView, size: Double) in
        view.size = size
      }
      Prop("color") { (view: ToastSymbolView, color: UIColor?) in
        view.imageView.tintColor = color
      }
    }
  }
}

/// The toast HUD: its backdrop (Liquid Glass on iOS 26 and later, the thick blur material system HUDs used before
/// that) with the React children on top. It animates itself in and out, the backdrop, the content and the motion
/// in one animation, so they arrive and leave together. A glass effect view under an ancestor with alpha below 1
/// never renders, so the backdrop fades by animating its effect, and JS must not fade this view or its ancestors.
final class ToastView: ExpoView {
  /// Sent once the toast has animated away.
  let onHidden = EventDispatcher()

  /// Moves with the animation; holds the backdrop and the content.
  private let hud = UIView()
  private let effectView = UIVisualEffectView(effect: nil)
  /// Where the React children mount.
  private let contentView = UIView()
  /// Set once, from the OS version; tests turn it off to see the blur.
  var usesGlass: Bool

  /// Slides up into place from a little smaller.
  static let hiddenTransform = CGAffineTransform(translationX: 0, y: 24).scaledBy(x: 0.9, y: 0.9)

  var visible = false {
    didSet {
      guard visible != oldValue else { return }
      // Once in a window, so the change animates instead of applying with the first layout.
      DispatchQueue.main.async { [weak self] in
        self?.animate()
      }
    }
  }

  var cornerRadius: CGFloat = 0 {
    didSet {
      effectView.layer.cornerRadius = cornerRadius
    }
  }

  required init(appContext: AppContext? = nil) {
    usesGlass = Self.glassAvailable
    super.init(appContext: appContext)
    effectView.layer.cornerCurve = .continuous
    effectView.isUserInteractionEnabled = false
    // Glass draws its own rim and shadow outside its shape; only the blur needs clipping.
    effectView.clipsToBounds = !usesGlass
    hud.addSubview(effectView)
    hud.addSubview(contentView)
    addSubview(hud)
    setHidden()
  }

  private static var glassAvailable: Bool {
    if #available(iOS 26.0, *) {
      return true
    }
    return false
  }

  private func makeEffect() -> UIVisualEffect {
    if #available(iOS 26.0, *), usesGlass {
      return UIGlassEffect()
    }
    return UIBlurEffect(style: .systemThickMaterial)
  }

  private func setHidden() {
    effectView.effect = nil
    contentView.alpha = 0
    hud.transform = Self.hiddenTransform
  }

  private func animate() {
    if visible {
      // Nearly critically damped: it settles without overshooting, as the system's HUDs do. The backdrop's
      // effect comes in slower than a linear fade (glass materializes late), so the content starts a little after
      // it and arrives with it.
      UIView.animate(springDuration: 0.35, bounce: 0, options: .beginFromCurrentState) {
        self.effectView.effect = self.makeEffect()
        self.hud.transform = .identity
      }
      UIView.animate(withDuration: 0.25, delay: 0.08, options: [.beginFromCurrentState, .curveEaseOut]) {
        self.contentView.alpha = 1
      }
    } else {
      // The backdrop's effect goes out faster than a linear fade (glass dematerializes early), so the content
      // fades over the first part of the same animation and is gone with it.
      UIView.animateKeyframes(withDuration: 0.2, delay: 0, options: [.beginFromCurrentState]) {
        UIView.addKeyframe(withRelativeStartTime: 0, relativeDuration: 1) {
          self.effectView.effect = nil
          self.hud.transform = Self.hiddenTransform
        }
        UIView.addKeyframe(withRelativeStartTime: 0, relativeDuration: 0.6) {
          self.contentView.alpha = 0
        }
      } completion: { [weak self] _ in
        guard let self, !self.visible else { return }
        self.onHidden()
      }
    }
  }

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    contentView.insertSubview(childComponentView, at: index)
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    // Bounds and center, not frame, which is undefined under a transform.
    hud.bounds = bounds
    hud.center = CGPoint(x: bounds.midX, y: bounds.midY)
    effectView.frame = hud.bounds
    contentView.frame = hud.bounds
  }
}

/// An SF Symbol, centered in the view.
final class ToastSymbolView: ExpoView {
  let imageView = UIImageView()

  var name = "" {
    didSet { updateImage() }
  }

  var size: CGFloat = 20 {
    didSet { updateImage() }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isUserInteractionEnabled = false
    imageView.contentMode = .center
    addSubview(imageView)
  }

  private func updateImage() {
    let configuration = UIImage.SymbolConfiguration(pointSize: size, weight: .semibold)
    imageView.image = UIImage(systemName: name, withConfiguration: configuration)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    imageView.frame = bounds
  }
}

/// Finds the tab bar the person sees: along the bottom on iPhone, but UIKit can put it elsewhere (at a side on a
/// small display, at the top on iPad, where it floats and the bar itself is hidden), and nothing shows it on the
/// login, under a sheet or on the Mac.
enum TabBarLocator {
  /// The visible tab bar's frame in its window, with the window's size, or nil when none shows. Only in the scene
  /// whose session has the id `windowId`, when given.
  @MainActor static func frame(windowId: String? = nil) -> [String: Double]? {
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .filter { windowId == nil || $0.session.persistentIdentifier == windowId }
    for window in scenes.flatMap(\.windows) {
      if let frame = frame(in: window) {
        return frame
      }
    }
    return nil
  }

  @MainActor static func frame(in window: UIWindow) -> [String: Double]? {
    guard let root = window.rootViewController,
      // A sheet or a full screen modal covers the tab bar.
      root.presentedViewController == nil,
      let bar = tabBar(under: root),
      isShowing(bar, in: window)
    else { return nil }
    let frame = bar.convert(bar.bounds, to: window)
    guard frame.intersects(window.bounds) else { return nil }
    return [
      "x": frame.minX,
      "y": frame.minY,
      "width": frame.width,
      "height": frame.height,
      "windowWidth": window.bounds.width,
      "windowHeight": window.bounds.height,
    ]
  }

  /// The tab bar of the first tab bar controller among `controller` and its children.
  @MainActor static func tabBar(under controller: UIViewController) -> UITabBar? {
    if let tabs = controller as? UITabBarController {
      return tabs.tabBar
    }
    for child in controller.children {
      if let bar = tabBar(under: child) {
        return bar
      }
    }
    return nil
  }

  /// In the window, with neither it nor any view above it hidden or transparent.
  @MainActor static func isShowing(_ view: UIView, in window: UIWindow) -> Bool {
    guard view.window === window, !view.bounds.isEmpty else { return false }
    var current: UIView? = view
    while let shown = current {
      if shown.isHidden || shown.alpha < 0.01 {
        return false
      }
      current = shown.superview
    }
    return true
  }
}
