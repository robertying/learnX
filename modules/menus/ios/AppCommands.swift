import UIKit

/// The app's commands in the menu bar (Mac, and iPad with iPadOS 26), which also makes their shortcuts work with a
/// hardware keyboard and lists them when ⌘ is held on iPad. JS handles them: each one posts `notification`, which
/// `MenusModule` forwards as an `onCommand` event.
public enum AppCommands {
  public static let notification = Notification.Name("io.robertying.learnx.AppCommand")
  public static let commandKey = "command"

  private struct Command {
    let id: String
    /// English; the app's `Localizable.xcstrings` translates it.
    let title: String
    let systemImage: String
    let input: String
    let modifiers: UIKeyModifierFlags
  }

  private static let refresh = Command(
    id: "refresh", title: "Refresh", systemImage: "arrow.clockwise",
    input: "r", modifiers: .command)
  private static let search = Command(
    id: "search", title: "Search", systemImage: "magnifyingglass",
    input: "f", modifiers: .command)
  private static let settings = Command(
    id: "settings", title: "Settings…", systemImage: "gearshape",
    input: ",", modifiers: .command)
  private static let previousItem = Command(
    id: "previousItem", title: "Previous Item", systemImage: "chevron.up",
    input: UIKeyCommand.inputUpArrow, modifiers: [.command, .alternate])
  private static let nextItem = Command(
    id: "nextItem", title: "Next Item", systemImage: "chevron.down",
    input: UIKeyCommand.inputDownArrow, modifiers: [.command, .alternate])

  /// Call from the app delegate's `buildMenu(with:)`, after `super`.
  public static func buildMenu(with builder: UIMenuBuilder) {
    guard builder.system == .main else {
      return
    }

    // Settings… goes where every app has it: the app menu, after About.
    let settingsMenu = UIMenu(options: .displayInline, children: [keyCommand(settings)])
    if builder.menu(for: .preferences) != nil {
      builder.replace(menu: .preferences, with: settingsMenu)
    } else if builder.menu(for: .about) != nil {
      builder.insertSibling(settingsMenu, afterMenu: .about)
    } else if builder.menu(for: .application) != nil {
      builder.insertChild(settingsMenu, atStartOfMenu: .application)
    }

    // ⌘F searches the app's content. UIKit's Find submenu would take the same shortcut for text views, which the
    // app doesn't offer find in.
    if builder.menu(for: .find) != nil {
      builder.remove(menu: .find)
    }
    if builder.menu(for: .edit) != nil {
      builder.insertChild(
        UIMenu(options: .displayInline, children: [keyCommand(search)]),
        atEndOfMenu: .edit
      )
    }

    if builder.menu(for: .view) != nil {
      builder.insertChild(
        UIMenu(
          identifier: UIMenu.Identifier("io.robertying.learnx.list"),
          options: .displayInline,
          children: [keyCommand(refresh), keyCommand(previousItem), keyCommand(nextItem)]
        ),
        atStartOfMenu: .view
      )
    }
  }

  private static func keyCommand(_ command: Command) -> UIKeyCommand {
    let keyCommand = UIKeyCommand(
      title: NSLocalizedString(command.title, bundle: .main, comment: "A menu bar command"),
      image: UIImage(systemName: command.systemImage),
      action: #selector(UIApplication.learnXPerformAppCommand(_:)),
      input: command.input,
      modifierFlags: command.modifiers,
      propertyList: command.id
    )
    // A text field or web view that also uses the shortcut doesn't swallow it.
    keyCommand.wantsPriorityOverSystemBehavior = true
    return keyCommand
  }

  fileprivate static func post(_ id: String) {
    NotificationCenter.default.post(name: notification, object: nil, userInfo: [commandKey: id])
  }
}

extension UIApplication {
  /// The commands' action. The application is always in the responder chain, so they work wherever focus is.
  @objc func learnXPerformAppCommand(_ sender: UICommand) {
    if let id = sender.propertyList as? String {
      AppCommands.post(id)
    }
  }
}
