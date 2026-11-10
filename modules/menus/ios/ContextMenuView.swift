import ExpoModulesCore
import UIKit

struct ContextMenuAction: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var systemImage: String = ""
}

/// Shows a menu of actions for its content on right-click (Mac, iPad with a pointer) or long press (iPad).
final class ContextMenuView: ExpoView, UIContextMenuInteractionDelegate {
  let onAction = EventDispatcher()

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
