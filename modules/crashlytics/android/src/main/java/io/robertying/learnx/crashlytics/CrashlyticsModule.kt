package io.robertying.learnx.crashlytics

import com.google.firebase.crashlytics.FirebaseCrashlytics
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class JSStackFrame : Record {
  @Field var symbol: String = ""
  @Field var file: String = ""
  @Field var line: Int = 0
  @Field var column: Int = 0
}

/** A JavaScript error. Its stack holds the JS frames, not the native ones that reported it. */
class JavaScriptError(message: String) : Exception(message) {
  companion object {
    /**
     * Shown as `JS.symbol(file:line:column)`. A negative line number leaves the file as it is, which keeps the
     * column, which symbolicating needs.
     */
    fun from(name: String, message: String, frames: List<JSStackFrame>) =
      JavaScriptError("$name: $message").apply {
        stackTrace = frames
          .map { StackTraceElement("JS", it.symbol, "${it.file}:${it.line}:${it.column}", -1) }
          .toTypedArray()
      }
  }
}

class CrashlyticsModule : Module() {
  private val crashlytics
    get() = FirebaseCrashlytics.getInstance()

  override fun definition() = ModuleDefinition {
    Name("Crashlytics")

    Function("recordError") { name: String, message: String, frames: List<JSStackFrame> ->
      recordError(name, message, frames)
    }

    Function("log") { message: String -> log(message) }

    Function("setCustomKey") { key: String, value: String -> setCustomKey(key, value) }
  }

  internal fun recordError(name: String, message: String, frames: List<JSStackFrame>) {
    crashlytics.recordException(JavaScriptError.from(name, message, frames))
  }

  internal fun log(message: String) {
    crashlytics.log(message)
  }

  internal fun setCustomKey(key: String, value: String) {
    crashlytics.setCustomKey(key, value)
  }
}
