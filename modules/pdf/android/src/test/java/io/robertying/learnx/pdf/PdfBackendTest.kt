package io.robertying.learnx.pdf

import android.os.Handler
import android.os.HandlerThread
import androidx.pdf.PdfPasswordException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import io.legere.pdfiumandroid.api.PdfPasswordException as PdfiumPasswordException

@RunWith(RobolectricTestRunner::class)
class PdfBackendTest {
  @Test
  fun usesJetpackWhereItHasTheNewerRenderer() {
    assertEquals(PdfBackend.JETPACK, PdfBackend.of(sdk = 35, sExtension = 0))
    assertEquals(PdfBackend.JETPACK, PdfBackend.of(sdk = 37, sExtension = 20))
    assertEquals(PdfBackend.JETPACK, PdfBackend.of(sdk = 30, sExtension = 13))
    assertEquals(PdfBackend.JETPACK, PdfBackend.of(sdk = 34, sExtension = 13))
  }

  @Test
  fun usesPdfiumWhereJetpackFallsBackToTheOldRenderer() {
    assertEquals(PdfBackend.PDFIUM, PdfBackend.of(sdk = 29, sExtension = 0))
    assertEquals(PdfBackend.PDFIUM, PdfBackend.of(sdk = 30, sExtension = 12))
    assertEquals(PdfBackend.PDFIUM, PdfBackend.of(sdk = 34, sExtension = 12))
  }

  @Test
  fun readsThisDevice() {
    // Robolectric runs the newest Android it has (robolectric.properties).
    assertEquals(PdfBackend.JETPACK, PdfBackend.forDevice())
  }

  @Test
  fun saysWhenEitherViewerNeedsAPassword() {
    assertEquals(PASSWORD_MESSAGE, errorMessage(PdfPasswordException("locked")))
    assertEquals(PASSWORD_MESSAGE, errorMessage(PdfiumPasswordException("locked")))
    assertEquals("broken", errorMessage(IllegalStateException("broken")))
    assertEquals("java.io.IOException", errorMessage(java.io.IOException()))
  }

  /** A document is closed only once the render running on the renderer thread is done. */
  @Test
  fun closesAfterTheRunningRender() {
    val thread = HandlerThread("PDF renderer").apply { start() }
    val renderer = Handler(thread.looper)
    val events = mutableListOf<String>()
    val rendering = CountDownLatch(1)
    val release = CountDownLatch(1)
    renderer.post {
      rendering.countDown()
      release.await()
      events += "rendered"
    }
    rendering.await()
    val closed = CountDownLatch(1)
    closeAfterRendering(renderer) {
      events += "closed"
      closed.countDown()
    }
    assertEquals(emptyList<String>(), events)
    release.countDown()
    shadowOf(thread.looper).idle()
    assertTrue(closed.await(5, TimeUnit.SECONDS))
    assertEquals(listOf("rendered", "closed"), events)
    thread.quitSafely()
  }

  @Test
  fun closesRightAwayWithoutARenderer() {
    var closed = false
    closeAfterRendering(null) { closed = true }
    assertTrue(closed)
  }

  /** The renderer thread already quit: nothing renders there any more. */
  @Test
  fun closesRightAwayWhenTheRendererHasQuit() {
    val thread = HandlerThread("PDF renderer").apply { start() }
    val renderer = Handler(thread.looper)
    thread.quit()
    var closed = false
    closeAfterRendering(renderer) { closed = true }
    assertTrue(closed)
  }
}
