import Testing

@testable import LearnXMenuBar

private struct Failure: Error {}

/// A login item that does what it's asked, or `register` fails or leaves it needing approval.
@MainActor
private final class FakeLoginItem: LoginItemService {
  var state: OpenAtLoginState
  var registers: OpenAtLoginState = .on
  var fails = false
  var calls: [String] = []

  init(_ state: OpenAtLoginState) {
    self.state = state
  }

  func register() throws {
    calls.append("register")
    if fails {
      throw Failure()
    }
    state = registers
  }

  func unregister() throws {
    calls.append("unregister")
    state = .off
  }

  func openSystemSettings() {
    calls.append("settings")
  }
}

@MainActor
struct OpenAtLoginTests {
  @Test func turnsOnAndOff() throws {
    let item = FakeLoginItem(.off)
    #expect(try OpenAtLogin.set(true, service: item) == .on)
    #expect(try OpenAtLogin.set(false, service: item) == .off)
    #expect(item.calls == ["register", "unregister"])
  }

  @Test func leavesItAsItIs() throws {
    let on = FakeLoginItem(.on)
    #expect(try OpenAtLogin.set(true, service: on) == .on)
    let off = FakeLoginItem(.off)
    #expect(try OpenAtLogin.set(false, service: off) == .off)
    #expect(on.calls.isEmpty && off.calls.isEmpty)
  }

  @Test func opensSystemSettingsWhereOnlyTheUserCanAllowIt() throws {
    let item = FakeLoginItem(.requiresApproval)
    #expect(try OpenAtLogin.set(true, service: item) == .requiresApproval)
    #expect(item.calls == ["settings"])

    let registering = FakeLoginItem(.off)
    registering.registers = .requiresApproval
    #expect(try OpenAtLogin.set(true, service: registering) == .requiresApproval)
    #expect(registering.calls == ["register", "settings"])
  }

  @Test func removesOneThatNeedsApproval() throws {
    let item = FakeLoginItem(.requiresApproval)
    #expect(try OpenAtLogin.set(false, service: item) == .off)
    #expect(item.calls == ["unregister"])
  }

  @Test func passesOnAFailure() {
    let item = FakeLoginItem(.off)
    item.fails = true
    #expect(throws: Failure.self) {
      try OpenAtLogin.set(true, service: item)
    }
  }

  #if targetEnvironment(macCatalyst)
    @Test func readsTheStateOnTheMac() {
      // Only reads it: registering would add the test host to the Mac's login items.
      _ = SystemLoginItem().state
    }
  #else
    @Test func isNeverOnOffTheMac() throws {
      // iPhone and iPad have no login items.
      #expect(SystemLoginItem().state == .off)
      #expect(try OpenAtLogin.set(true, service: SystemLoginItem()) == .off)
    }
  #endif
}
