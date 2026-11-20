import ExpoModulesCore
import ExpoUI
import SwiftUI

/// Tab (or, with `backward`, Shift-Tab) on a SwiftUI text field, for JS to move the focus: Mac Catalyst doesn't move
/// between the fields of an Expo UI host on its own, as an AppKit sign-in form does. Other keys go on to the field.
struct TabKeyModifier: ViewModifier, Record {
  static let type = "onTabKey"

  @Field var backward = false
  var eventDispatcher: EventDispatcher?

  init() {}

  init(from params: Dict, appContext: AppContext, eventDispatcher: EventDispatcher) throws {
    try self = .init(from: params, appContext: appContext)
    self.eventDispatcher = eventDispatcher
  }

  /// Whether `modifiers` are the ones this Tab takes.
  func handles(_ modifiers: EventModifiers) -> Bool {
    modifiers.subtracting(.capsLock) == (backward ? .shift : [])
  }

  /// A Tab pressed with `modifiers`: sent to JS if this Tab takes them, else left to the field.
  func press(_ modifiers: EventModifiers) -> KeyPress.Result {
    guard handles(modifiers) else {
      return .ignored
    }
    eventDispatcher?([Self.type: [:]])
    return .handled
  }

  func body(content: Content) -> some View {
    content.onKeyPress(.tab, phases: .down) { press($0.modifiers) }
  }

  static func register() {
    ViewModifierRegistry.register(type) { params, appContext, eventDispatcher in
      try TabKeyModifier(from: params, appContext: appContext, eventDispatcher: eventDispatcher)
    }
  }
}
