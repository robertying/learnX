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

/// Liquid Glass on iOS 26 and later; the thick blur material system HUDs used before that.
final class ToastBackgroundView: ExpoView {
  private let effectView: UIVisualEffectView

  var cornerRadius: CGFloat = 0 {
    didSet {
      effectView.layer.cornerRadius = cornerRadius
    }
  }

  required init(appContext: AppContext? = nil) {
    effectView = UIVisualEffectView(effect: Self.makeEffect())
    super.init(appContext: appContext)
    isUserInteractionEnabled = false
    effectView.layer.cornerCurve = .continuous
    // Glass draws its own rim and shadow outside its shape; only the blur needs clipping.
    effectView.clipsToBounds = effectView.effect is UIBlurEffect
    addSubview(effectView)
  }

  private static func makeEffect() -> UIVisualEffect {
#if compiler(>=6.2)  // Xcode 26
    if #available(iOS 26.0, *) {
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
