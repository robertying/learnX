import ExpoModulesCore
import UIKit

/// UIKit views for the toast HUD. The toast draws in react-native-screens' `FullWindowOverlay`, a plain subview of
/// the window with no view controller above it, where SwiftUI hosts (@expo/ui) refuse to render.
public final class ToastModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LearnXToast")

    View(ToastBackgroundView.self) {
      Prop("cornerRadius") { (view: ToastBackgroundView, radius: Double) in
        view.cornerRadius = radius
      }
      Prop("visible") { (view: ToastBackgroundView, visible: Bool) in
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

/// Liquid Glass on iOS 26 and later; the thick blur material system HUDs used before that. It fades itself in and
/// out by animating the effect, because a glass effect view under an ancestor with alpha below 1 never renders: JS
/// must not fade this view or its ancestors.
final class ToastBackgroundView: ExpoView {
  private let effectView = UIVisualEffectView(effect: nil)
  private let usesGlass: Bool

  var visible = false {
    didSet {
      guard visible != oldValue else { return }
      // Once in a window, so the change animates instead of applying with the first layout.
      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        UIView.animate(withDuration: self.visible ? 0.3 : 0.2) {
          self.effectView.effect = self.visible ? self.makeEffect() : nil
        }
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
    isUserInteractionEnabled = false
    effectView.layer.cornerCurve = .continuous
    // Glass draws its own rim and shadow outside its shape; only the blur needs clipping.
    effectView.clipsToBounds = !usesGlass
    addSubview(effectView)
  }

  private static var glassAvailable: Bool {
#if compiler(>=6.2)  // Xcode 26
    if #available(iOS 26.0, *) {
      return true
    }
#endif
    return false
  }

  private func makeEffect() -> UIVisualEffect {
#if compiler(>=6.2)  // Xcode 26
    if #available(iOS 26.0, *), usesGlass {
      return UIGlassEffect()
    }
#endif
    return UIBlurEffect(style: .systemThickMaterial)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    effectView.frame = bounds
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
