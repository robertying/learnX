import FirebaseCore
import FirebaseCrashlytics
internal import LearnXCrashlytics

/// Firebase comes from Swift Package Manager into the app target, and the crash reporting module (a pod) can't import
/// it, so the app starts Firebase and hands the module this reporter.
enum CrashReporting {
  static func start() {
    FirebaseApp.configure()
    CrashlyticsModule.reporter = CrashlyticsReporter()
  }
}

/// Records JavaScript errors in Crashlytics with their JS frames as the stack.
struct CrashlyticsReporter: CrashReporter {
  func recordError(name: String, reason: String, frames: [CrashFrame]) {
    Crashlytics.crashlytics().record(exceptionModel: Self.exception(name: name, reason: reason, frames: frames))
  }

  func log(_ message: String) {
    Crashlytics.crashlytics().log(message)
  }

  func setCustomValue(_ value: String, forKey key: String) {
    Crashlytics.crashlytics().setCustomValue(value, forKey: key)
  }

  static func exception(name: String, reason: String, frames: [CrashFrame]) -> ExceptionModel {
    let exception = ExceptionModel(name: name, reason: reason)
    exception.stackTrace = frames.map { StackFrame(symbol: $0.symbol, file: $0.file, line: $0.line) }
    return exception
  }
}
