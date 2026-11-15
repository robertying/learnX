import ExpoModulesCore
import UIKit

struct ContextMenuAction: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var systemImage: String = ""
}

/// Shows a menu of actions for its content on right-click (Mac, iPad with a pointer) or long press (iPad).
///
/// With `keyboardFocusable`, it also takes keyboard focus, as rows do in Mail: Tab moves focus into the list, the
/// arrow keys between its rows (UIKit's focus system, which draws the focus ring and scrolls to the focused row), and
/// Return or Space sends `onPrimaryAction`.
final class ContextMenuView: ExpoView, UIContextMenuInteractionDelegate {
  let onAction = EventDispatcher()
  let onPrimaryAction = EventDispatcher()

  var keyboardFocusable = false {
    didSet {
      focusEffect = keyboardFocusable ? UIFocusHaloEffect() : nil
      if !keyboardFocusable, isFocused {
        setNeedsFocusUpdate()
      }
    }
  }

  override var canBecomeFocused: Bool { keyboardFocusable }

  /// Whether a key opens the focused row: Return, Enter or Space.
  static func opens(_ key: UIKeyboardHIDUsage) -> Bool {
    key == .keyboardReturnOrEnter || key == .keypadEnter || key == .keyboardSpacebar
  }

  override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    guard isFocused, presses.contains(where: { $0.key.map { Self.opens($0.keyCode) } ?? false }) else {
      super.pressesBegan(presses, with: event)
      return
    }
    onPrimaryAction()
  }

  private var actions: [ContextMenuAction] = []
  private lazy var interaction = UIContextMenuInteraction(delegate: self)

  func setActions(_ newActions: [ContextMenuAction]) {
    actions = newActions
    if actions.isEmpty {
      removeInteraction(interaction)
    } else if !interactions.contains(where: { $0 === interaction }) {
      addInteraction(interaction)
    }
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    guard !actions.isEmpty else {
      return nil
    }
    return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in
      self?.menu()
    }
  }

  /// The actions' menu. Choosing one sends its key.
  func menu() -> UIMenu {
    UIMenu(
      children: actions.map { action in
        UIAction(
          title: action.title,
          image: action.systemImage.isEmpty ? nil : UIImage(systemName: action.systemImage)
        ) { [weak self] _ in
          self?.onAction(["key": action.key])
        }
      })
  }
}
