import ExpoModulesCore
import Testing

@testable import LearnXCrashlytics

/// Only touched from the tests' main actor.
final class FakeReporter: CrashReporter, @unchecked Sendable {
  struct Recorded: Equatable {
    var name: String
    var reason: String
    var frames: [CrashFrame]
  }

  var errors: [Recorded] = []
  var logs: [String] = []
  var keys: [String: String] = [:]

  func recordError(name: String, reason: String, frames: [CrashFrame]) {
    errors.append(Recorded(name: name, reason: reason, frames: frames))
  }

  func log(_ message: String) {
    logs.append(message)
  }

  func setCustomValue(_ value: String, forKey key: String) {
    keys[key] = value
  }
}

func frame(_ symbol: String, _ file: String, _ line: Int, _ column: Int) -> JSStackFrame {
  var frame = JSStackFrame()
  frame.symbol = symbol
  frame.file = file
  frame.line = line
  frame.column = column
  return frame
}

/// The module with a fake in place of Crashlytics, which the test host doesn't link.
@MainActor
@Suite struct CrashlyticsModuleTests {
  let fake = FakeReporter()
  let module = CrashlyticsModule(appContext: AppContext())

  init() {
    module.reporter = fake
  }

  @Test func definesItsFunctions() {
    _ = module.definition()
  }

  @Test func recordsTheJSStack() {
    module.recordError(
      name: "TypeError",
      message: "undefined is not a function",
      frames: [frame("render", "index.bundle", 10, 4), frame("<global>", "index.bundle", 1, 0)]
    )

    #expect(
      fake.errors == [
        .init(
          name: "TypeError",
          reason: "undefined is not a function",
          frames: [
            CrashFrame(symbol: "render", file: "index.bundle:10:4", line: 10),
            CrashFrame(symbol: "<global>", file: "index.bundle:1:0", line: 1),
          ]
        )
      ]
    )
  }

  @Test func logs() {
    module.addLog("Opened a notice")
    #expect(fake.logs == ["Opened a notice"])
  }

  @Test func setsKeys() {
    module.setCustomKey("screen", "Notices")
    #expect(fake.keys == ["screen": "Notices"])
  }

  @Test func takesTheAppsReporter() {
    CrashlyticsModule.reporter = fake
    defer { CrashlyticsModule.reporter = nil }
    let module = CrashlyticsModule(appContext: AppContext())
    module.addLog("Launched")
    #expect(fake.logs == ["Launched"])
  }

  @Test func reportsNothingWithoutAReporter() {
    let module = CrashlyticsModule(appContext: AppContext())
    #expect(module.reporter == nil)
    // Nothing to send it to, and no crash.
    module.addLog("Launched")
  }
}
