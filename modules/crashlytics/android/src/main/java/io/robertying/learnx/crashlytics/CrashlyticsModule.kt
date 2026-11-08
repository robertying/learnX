package io.robertying.learnx.crashlytics

import com.google.firebase.crashlytics.FirebaseCrashlytics
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class JSStackFrame : Record {
  @Field val symbol: String = ""
  @Field val file: String = ""
  @Field val line: Int = 0
  @Field val column: Int = 0
}

/** A JavaScript error. Its stack holds the JS frames, not the native ones that reported it. */
class JavaScriptError(message: String) : Exception(message)

class CrashlyticsModule : Module() {
  private val crashlytics
    get() = FirebaseCrashlytics.getInstance()

  override fun definition() = ModuleDefinition {
    Name("Crashlytics")

    Function("recordError") { name: String, message: String, frames: List<JSStackFrame> ->
      val error = JavaScriptError("$name: $message")
      // Shown as `JS.symbol(file:line:column)`. A negative line number leaves the file as it is, which keeps the
      // column: Hermes bundles are a single line.
      error.stackTrace = frames
        .map { StackTraceElement("JS", it.symbol, "${it.file}:${it.line}:${it.column}", -1) }
        .toTypedArray()
      crashlytics.recordException(error)
    }

    Function("log") { message: String ->
      crashlytics.log(message)
    }

    Function("setCustomKey") { key: String, value: String ->
      crashlytics.setCustomKey(key, value)
    }
  }
}
