internal import ExpoModulesCore
internal import ExpoUI
import SwiftUI
import Testing

/// What patches/@expo__ui@58.0.28.patch changes on iOS: a `Button` takes its role from `buttonRole`, which JS sends
/// because React Native reads a host view's `role` prop as an accessibility role and logs "Unsupported Role value" for
/// SwiftUI's roles. `role` still works for widget layouts, which send it as is.
@MainActor
@Suite struct ExpoUIPatchTests {
  private func props(_ rawProps: [String: Any]) throws -> ExpoUI.ButtonProps {
    try ExpoUI.ButtonProps(rawProps: rawProps, context: AppContext())
  }

  @Test func buttonRoleSetsTheRole() throws {
    #expect(try props(["buttonRole": "destructive"]).nativeRole == .destructive)
    #expect(try props(["buttonRole": "cancel"]).nativeRole == .cancel)
  }

  @Test func roleStillWorks() throws {
    #expect(try props(["role": "destructive"]).nativeRole == .destructive)
  }

  @Test func noRoleIsNone() throws {
    #expect(try props([:]).nativeRole == nil)
    #expect(try props(["buttonRole": "default"]).nativeRole == nil)
  }
}
