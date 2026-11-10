import ExpoModulesCore
import FirebaseCrashlytics

struct JSStackFrame: Record {
  @Field var symbol: String = ""
  @Field var file: String = ""
  @Field var line: Int = 0
  @Field var column: Int = 0

  /// A frame only has a line, and symbolicating needs the column too, so it goes with the file.
  var stackFrame: StackFrame {
    StackFrame(symbol: symbol, file: "\(file):\(line):\(column)", line: line)
  }
}

/// What the module asks of Crashlytics, so tests can record into a fake.
protocol CrashReporter {
  func record(exceptionModel: ExceptionModel)
  func log(_ msg: String)
  func setCustomValue(_ value: Any?, forKey key: String)
}

extension Crashlytics: CrashReporter {}

/// Reports JavaScript errors to Crashlytics with their JS frames as the stack, so the console shows where they
/// happened in the bundle instead of the native frames that reported them.
public final class CrashlyticsModule: Module {
  /// Crashlytics itself; tests use a fake.
  lazy var reporter: CrashReporter = Crashlytics.crashlytics()

  public func definition() -> ModuleDefinition {
    Name("Crashlytics")

    Function("recordError", recordError)
    Function("log", addLog)
    Function("setCustomKey", setCustomKey)
  }

  func recordError(name: String, message: String, frames: [JSStackFrame]) {
    let exception = ExceptionModel(name: name, reason: message)
    exception.stackTrace = frames.map(\.stackFrame)
    reporter.record(exceptionModel: exception)
  }

  func addLog(_ message: String) {
    reporter.log(message)
  }

  func setCustomKey(_ key: String, _ value: String) {
    reporter.setCustomValue(value, forKey: key)
  }
}
