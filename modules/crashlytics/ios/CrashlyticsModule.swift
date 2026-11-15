import ExpoModulesCore

struct JSStackFrame: Record {
  @Field var symbol: String = ""
  @Field var file: String = ""
  @Field var line: Int = 0
  @Field var column: Int = 0

  /// A frame only has a line, and symbolicating needs the column too, so it goes with the file.
  var crashFrame: CrashFrame {
    CrashFrame(symbol: symbol, file: "\(file):\(line):\(column)", line: line)
  }
}

/// One frame of a reported error's stack.
public struct CrashFrame: Equatable, Sendable {
  public let symbol: String
  public let file: String
  public let line: Int

  public init(symbol: String, file: String, line: Int) {
    self.symbol = symbol
    self.file = file
    self.line = line
  }
}

/// What the module asks of Crashlytics. The app links Firebase as a Swift package, which a pod can't import, so the
/// app sets `CrashlyticsModule.reporter` to Crashlytics at launch; tests record into a fake.
public protocol CrashReporter: Sendable {
  func recordError(name: String, reason: String, frames: [CrashFrame])
  func log(_ message: String)
  func setCustomValue(_ value: String, forKey key: String)
}

/// Reports JavaScript errors to Crashlytics with their JS frames as the stack, so the console shows where they
/// happened in the bundle instead of the native frames that reported them.
public final class CrashlyticsModule: Module {
  /// Set once by the app at launch, before JavaScript runs; nil reports nothing (the modules' test host).
  nonisolated(unsafe) public static var reporter: CrashReporter?

  /// The app's reporter; tests use a fake.
  lazy var reporter: CrashReporter? = Self.reporter

  public func definition() -> ModuleDefinition {
    Name("Crashlytics")

    Function("recordError", recordError)
    Function("log", addLog)
    Function("setCustomKey", setCustomKey)
  }

  func recordError(name: String, message: String, frames: [JSStackFrame]) {
    reporter?.recordError(name: name, reason: message, frames: frames.map(\.crashFrame))
  }

  func addLog(_ message: String) {
    reporter?.log(message)
  }

  func setCustomKey(_ key: String, _ value: String) {
    reporter?.setCustomValue(value, forKey: key)
  }
}
