import Testing
import UIKit

@testable import LearnXMenus

/// A menu bar with some of the system's menus, recording what the commands change.
final class FakeMenuBuilder: MenuBuilding {
  enum Change: Equatable {
    case replace(UIMenu.Identifier)
    case insertSibling(after: UIMenu.Identifier)
    case insertChild(atStartOf: UIMenu.Identifier)
    case insertChild(atEndOf: UIMenu.Identifier)
    case remove(UIMenu.Identifier)
  }

  let system: UIMenuSystem
  let menus: Set<UIMenu.Identifier>
  var changes: [Change] = []
  var inserted: [UIMenu] = []

  init(system: UIMenuSystem = .main, menus: Set<UIMenu.Identifier>) {
    self.system = system
    self.menus = menus
  }

  func menu(for identifier: UIMenu.Identifier) -> UIMenu? {
    menus.contains(identifier) ? UIMenu(identifier: identifier, children: []) : nil
  }

  func replace(menu: UIMenu.Identifier, with replacement: UIMenu) {
    changes.append(.replace(menu))
    inserted.append(replacement)
  }

  func insertSibling(_ sibling: UIMenu, afterMenu: UIMenu.Identifier) {
    changes.append(.insertSibling(after: afterMenu))
    inserted.append(sibling)
  }

  func insertChild(_ child: UIMenu, atStartOfMenu: UIMenu.Identifier) {
    changes.append(.insertChild(atStartOf: atStartOfMenu))
    inserted.append(child)
  }

  func insertChild(_ child: UIMenu, atEndOfMenu: UIMenu.Identifier) {
    changes.append(.insertChild(atEndOf: atEndOfMenu))
    inserted.append(child)
  }

  func remove(menu: UIMenu.Identifier) {
    changes.append(.remove(menu))
  }

  /// The commands inserted, by their ids.
  var commandIds: [[String]] {
    inserted.map { menu in menu.children.compactMap { ($0 as? UIKeyCommand)?.propertyList as? String } }
  }
}

@MainActor
@Suite struct AppCommandsTests {
  @Test func addsTheCommandsToTheMenuBar() {
    let builder = FakeMenuBuilder(menus: [.application, .about, .preferences, .edit, .find, .view])
    AppCommands.buildMenu(in: builder)

    #expect(
      builder.changes == [
        .replace(.preferences),
        .remove(.find),
        .insertChild(atEndOf: .edit),
        .insertChild(atStartOf: .view),
      ]
    )
    #expect(builder.commandIds == [["settings"], ["search"], ["refresh", "previousItem", "nextItem"]])
  }

  @Test func putsSettingsAfterAboutWithoutAPreferencesMenu() {
    let builder = FakeMenuBuilder(menus: [.application, .about])
    AppCommands.buildMenu(in: builder)
    #expect(builder.changes == [.insertSibling(after: .about)])
  }

  @Test func putsSettingsFirstInTheAppMenuWithoutAbout() {
    let builder = FakeMenuBuilder(menus: [.application])
    AppCommands.buildMenu(in: builder)
    #expect(builder.changes == [.insertChild(atStartOf: .application)])
  }

  @Test func addsNothingWithoutTheMenus() {
    let builder = FakeMenuBuilder(menus: [])
    AppCommands.buildMenu(in: builder)
    #expect(builder.changes.isEmpty)
  }

  @Test func leavesContextMenusAlone() {
    let builder = FakeMenuBuilder(system: .context, menus: [.application, .edit, .view])
    AppCommands.buildMenu(in: builder)
    #expect(builder.changes.isEmpty)
  }

  @Test func makesKeyCommands() {
    let command = AppCommands.keyCommand(AppCommands.previousItem)

    #expect(command.title == "Previous Item")
    #expect(command.image != nil)
    #expect(command.input == UIKeyCommand.inputUpArrow)
    #expect(command.modifierFlags == [.command, .alternate])
    #expect(command.propertyList as? String == "previousItem")
    #expect(command.action == #selector(UIApplication.learnXPerformAppCommand(_:)))
    #expect(command.wantsPriorityOverSystemBehavior)
  }

  @Test func postsTheChosenCommand() {
    let received = Box<[String]>([])
    let observer = NotificationCenter.default.addObserver(
      forName: AppCommands.notification,
      object: nil,
      queue: nil
    ) { notification in
      received.value.append(notification.userInfo?[AppCommands.commandKey] as? String ?? "?")
    }
    defer { NotificationCenter.default.removeObserver(observer) }

    UIApplication.shared.learnXPerformAppCommand(AppCommands.keyCommand(AppCommands.refresh))
    // A command without an id does nothing.
    UIApplication.shared.learnXPerformAppCommand(UICommand(title: "Other", action: #selector(UIApplication.learnXPerformAppCommand(_:))))

    #expect(received.value == ["refresh"])
  }
}

final class Box<Value>: @unchecked Sendable {
  var value: Value

  init(_ value: Value) {
    self.value = value
  }
}
