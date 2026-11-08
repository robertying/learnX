import ExpoModulesCore
import FirebaseCrashlytics

struct JSStackFrame: Record {
  @Field var symbol: String = ""
  @Field var file: String = ""
  @Field var line: Int = 0
  @Field var column: Int = 0
}

/// Reports JavaScript errors to Crashlytics with their JS frames as the stack, so the console shows where they
/// happened in the bundle instead of the native frames that reported them.
public final class CrashlyticsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Crashlytics")

    Function("recordError") { (name: String, message: String, frames: [JSStackFrame]) in
      let exception = ExceptionModel(name: name, reason: message)
      // A frame only has a line, and symbolicating needs the column too, so it goes with the file.
      exception.stackTrace = frames.map {
        StackFrame(symbol: $0.symbol, file: "\($0.file):\($0.line):\($0.column)", line: $0.line)
      }
      Crashlytics.crashlytics().record(exceptionModel: exception)
    }

    Function("log") { (message: String) in
      Crashlytics.crashlytics().log(message)
    }

    Function("setCustomKey") { (key: String, value: String) in
      Crashlytics.crashlytics().setCustomValue(value, forKey: key)
    }
  }
}
