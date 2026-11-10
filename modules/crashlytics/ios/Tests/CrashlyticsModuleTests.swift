import ExpoModulesCore
import FirebaseCrashlytics
import Testing

@testable import LearnXCrashlytics

final class FakeReporter: CrashReporter {
  var exceptions: [ExceptionModel] = []
  var logs: [String] = []
  var keys: [String: String] = [:]

  func record(exceptionModel: ExceptionModel) {
    exceptions.append(exceptionModel)
  }

  func log(_ msg: String) {
    logs.append(msg)
  }

  func setCustomValue(_ value: Any?, forKey key: String) {
    keys[key] = value as? String
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

/// The module with a fake in place of Crashlytics, which the test host doesn't configure.
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

    #expect(fake.exceptions.count == 1)
    #expect(fake.exceptions.first?.stackTrace.count == 2)
  }

  @Test func logs() {
    module.addLog("Opened a notice")
    #expect(fake.logs == ["Opened a notice"])
  }

  @Test func setsKeys() {
    module.setCustomKey("screen", "Notices")
    #expect(fake.keys == ["screen": "Notices"])
  }
}
