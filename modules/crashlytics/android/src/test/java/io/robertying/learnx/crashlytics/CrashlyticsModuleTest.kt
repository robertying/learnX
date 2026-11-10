package io.robertying.learnx.crashlytics

import com.google.firebase.crashlytics.FirebaseCrashlytics
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

private fun frame(symbol: String, file: String, line: Int, column: Int) =
  JSStackFrame().apply {
    this.symbol = symbol
    this.file = file
    this.line = line
    this.column = column
  }

class JavaScriptErrorTest {
  @Test
  fun hasTheJsFramesAsItsStack() {
    val error = JavaScriptError.from(
      "TypeError",
      "undefined is not a function",
      listOf(frame("render", "index.bundle", 10, 4), frame("<global>", "index.bundle", 1, 0)),
    )

    assertEquals("TypeError: undefined is not a function", error.message)
    assertArrayEquals(
      arrayOf(
        StackTraceElement("JS", "render", "index.bundle:10:4", -1),
        StackTraceElement("JS", "<global>", "index.bundle:1:0", -1),
      ),
      error.stackTrace,
    )
    // The column stays with the file.
    assertEquals("JS.render(index.bundle:10:4)", error.stackTrace[0].toString())
  }
}

class CrashlyticsModuleTest {
  private val crashlytics = mockk<FirebaseCrashlytics>(relaxed = true)
  private val module = CrashlyticsModule()

  @Before
  fun mockCrashlytics() {
    mockkStatic(FirebaseCrashlytics::class)
    every { FirebaseCrashlytics.getInstance() } returns crashlytics
  }

  @After
  fun restoreCrashlytics() {
    unmockkStatic(FirebaseCrashlytics::class)
  }

  @Test
  fun definesItsFunctions() {
    module.definition()
  }

  @Test
  fun recordsJsErrors() {
    val recorded = slot<Throwable>()
    every { crashlytics.recordException(capture(recorded)) } returns Unit

    module.recordError("Error", "boom", listOf(frame("f", "index.bundle", 1, 2)))

    assertEquals("Error: boom", recorded.captured.message)
    assertEquals("index.bundle:1:2", recorded.captured.stackTrace.single().fileName)
  }

  @Test
  fun logs() {
    module.log("Opened a notice")
    verify { crashlytics.log("Opened a notice") }
  }

  @Test
  fun setsKeys() {
    module.setCustomKey("screen", "Notices")
    verify { crashlytics.setCustomKey("screen", "Notices") }
  }
}
