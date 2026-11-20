import ExpoModulesCore
import SwiftUI
import Testing

@testable import LearnXMenus

/// The Tab key on the login page's fields on a Mac, which JS turns into a move to the other field.
@MainActor
@Suite struct TabKeyModifierTests {
  /// The modifier as Expo UI makes it from JS's props, with the events it has sent.
  private func modifier(_ params: [String: Any]) throws -> (TabKeyModifier, () -> [[String: Any]]) {
    let dispatcher = EventDispatcher()
    var sent: [[String: Any]] = []
    dispatcher.onEventSent = { sent.append($0) }
    let modifier = try TabKeyModifier(from: params, appContext: AppContext(), eventDispatcher: dispatcher)
    return (modifier, { sent })
  }

  /// Whether the modifier takes a Tab pressed with `modifiers`, rather than leave it to the field.
  private func takes(_ modifier: TabKeyModifier, _ modifiers: EventModifiers) -> Bool {
    if case .handled = modifier.press(modifiers) {
      return true
    }
    return false
  }

  @Test func sendsTabForward() throws {
    let (modifier, sent) = try modifier([:])
    #expect(!modifier.backward)
    #expect(takes(modifier, []))
    // Caps Lock doesn't change which way Tab goes.
    #expect(takes(modifier, .capsLock))
    #expect(sent().count == 2)
    #expect(sent().allSatisfy { $0.keys.sorted() == [TabKeyModifier.type] })
  }

  @Test func sendsShiftTabBackward() throws {
    let (modifier, sent) = try modifier(["backward": true])
    #expect(modifier.backward)
    #expect(takes(modifier, .shift))
    #expect(takes(modifier, [.shift, .capsLock]))
    #expect(sent().count == 2)
  }

  @Test func leavesOtherTabsToTheField() throws {
    let (forward, sentForward) = try modifier([:])
    #expect(!takes(forward, .shift))
    #expect(!takes(forward, .option))
    #expect(sentForward().isEmpty)

    let (backward, sentBackward) = try modifier(["backward": true])
    #expect(!takes(backward, []))
    #expect(!takes(backward, [.shift, .control]))
    #expect(sentBackward().isEmpty)
  }

  @Test func wrapsAField() {
    TabKeyModifier.register()
    let host = UIHostingController(rootView: TextField("Account", text: .constant("")).modifier(TabKeyModifier()))
    host.view.frame = CGRect(x: 0, y: 0, width: 320, height: 44)
    host.view.layoutIfNeeded()
  }
}
