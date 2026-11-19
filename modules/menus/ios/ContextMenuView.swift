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

  /// The presses that opened the row, which the view keeps from the views after it through to their end, as UIKit
  /// asks of a view that takes a press's start.
  private var openingPresses = Set<UIPress>()

  override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    let opening = isFocused ? presses.filter { $0.key.map { Self.opens($0.keyCode) } ?? false } : []
    if !opening.isEmpty {
      openingPresses.formUnion(opening)
      onPrimaryAction()
    }
    let rest = presses.subtracting(opening)
    if !rest.isEmpty {
      super.pressesBegan(rest, with: event)
    }
  }

  override func pressesChanged(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    let rest = presses.subtracting(openingPresses)
    if !rest.isEmpty {
      super.pressesChanged(rest, with: event)
    }
  }

  override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    let rest = finish(presses)
    if !rest.isEmpty {
      super.pressesEnded(rest, with: event)
    }
  }

  override func pressesCancelled(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    let rest = finish(presses)
    if !rest.isEmpty {
      super.pressesCancelled(rest, with: event)
    }
  }

  /// Forgets the opening presses among `presses`, which have ended, and returns the others.
  private func finish(_ presses: Set<UIPress>) -> Set<UIPress> {
    let opening = presses.intersection(openingPresses)
    openingPresses.subtract(opening)
    return presses.subtracting(opening)
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
