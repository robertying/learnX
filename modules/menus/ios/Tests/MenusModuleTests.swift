import ExpoModulesCore
import Testing
import UIKit

@testable import LearnXMenus

@MainActor
@Suite(.serialized) struct MenusModuleTests {
  @Test func definesItsFunctionsAndView() {
    _ = MenusModule(appContext: AppContext()).definition()
  }

  @Test func forwardsCommandsWhileJSListens() {
    let module = MenusModule(appContext: AppContext())
    module.startObserving()
    // Sent as events (dropped here, with no JS runtime); one without a command is ignored.
    AppCommands.post("refresh")
    NotificationCenter.default.post(name: AppCommands.notification, object: nil)
    module.stopObserving()
    module.stopObserving()
  }
}

func contextMenuAction(key: String, title: String, systemImage: String = "") -> ContextMenuAction {
  var action = ContextMenuAction()
  action.key = key
  action.title = title
  action.systemImage = systemImage
  return action
}

@MainActor
@Suite struct ContextMenuViewTests {
  @Test func offersAMenuOnlyWithActions() throws {
    let view = ContextMenuView(appContext: nil)
    let interaction = UIContextMenuInteraction(delegate: view)
    #expect(view.interactions.isEmpty)
    #expect(view.contextMenuInteraction(interaction, configurationForMenuAtLocation: .zero) == nil)

    view.setActions([contextMenuAction(key: "pin", title: "Pin", systemImage: "pin")])
    #expect(view.interactions.count == 1)
    #expect(view.contextMenuInteraction(interaction, configurationForMenuAtLocation: .zero) != nil)

    // Setting actions again keeps the one interaction.
    view.setActions([contextMenuAction(key: "hide", title: "Hide")])
    #expect(view.interactions.count == 1)

    view.setActions([])
    #expect(view.interactions.isEmpty)
  }

  @Test func listsTheActions() throws {
    let view = ContextMenuView(appContext: nil)
    view.setActions([
      contextMenuAction(key: "pin", title: "Pin", systemImage: "pin"),
      contextMenuAction(key: "hide", title: "Hide"),
    ])

    let actions = view.menu().children.compactMap { $0 as? UIAction }

    #expect(actions.map(\.title) == ["Pin", "Hide"])
    #expect(actions[0].image != nil)
    #expect(actions[1].image == nil)
  }
}
