package io.robertying.learnx.pdf

import android.app.Activity
import android.os.Looper
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import io.mockk.mockk
import io.mockk.mockkClass
import io.mockk.verify
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import java.time.Duration

/**
 * AndroidPdfViewer's side, with Pdfium's native libraries taken as loaded: the JVM can't load them, and nothing here
 * renders a page.
 */
@RunWith(RobolectricTestRunner::class)
class PdfiumViewTest {
  private val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
  private val root = FrameLayout(activity).also(activity::setContentView)

  @Before
  fun pretendPdfiumLoaded() {
    val core = Class.forName("io.legere.pdfiumandroid.core.unlocked.PdfiumCoreU")
    core.getDeclaredField("isLibraryLoaded").apply { isAccessible = true }.setBoolean(null, true)
    val ready = core.getDeclaredField("isReady").apply { isAccessible = true }.get(null)
    ready.javaClass.getMethod("markReady").invoke(ready)
  }

  private fun pdfView() = PdfView(reactContext(activity), mockk<AppContext>(relaxed = true), PdfBackend.PDFIUM)

  private fun idle() = shadowOf(Looper.getMainLooper()).idle()

  private fun file() = File.createTempFile("PdfiumViewTest", ".pdf").apply { writeText("%PDF-1.4") }

  @Test
  fun draws() {
    // PDFView turns its drawing off.
    assertFalse(PdfiumView(activity).willNotDraw())
  }

  @Test
  fun saysOnceItSettlesAtANewSize() {
    val view = PdfiumView(activity)
    var resized = 0
    view.onResize = { resized++ }
    root.addView(view)
    view.layout(0, 0, 400, 800)
    idle()
    assertEquals(0, resized)

    view.layout(0, 0, 800, 400)
    view.layout(0, 0, 700, 400)
    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(1))
    assertEquals(1, resized)
  }

  @Test
  fun forgetsAResizeWhenItLeaves() {
    val view = PdfiumView(activity)
    var resized = 0
    view.onResize = { resized++ }
    root.addView(view)
    view.layout(0, 0, 400, 800)
    view.layout(0, 0, 800, 400)
    root.removeView(view)
    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofSeconds(1))
    assertEquals(0, resized)
  }

  /** A document the view leaves the window with is closed after the renderer's work, not by the recycling. */
  @Test
  fun closesItsDocumentAfterRendering() {
    val view = PdfiumView(activity)
    root.addView(view)
    val documentClass = Class.forName("com.github.barteksc.pdfviewer.PdfFile")
    val document = mockkClass(documentClass.kotlin, relaxed = true)
    val field = view.javaClass.superclass.getDeclaredField("pdfFile").apply { isAccessible = true }
    field.set(view, document)
    root.removeView(view)
    idle()
    assertNull(field.get(view))
    verify { documentClass.getMethod("dispose").invoke(document) }
  }

  @Test
  fun opensOnceInAWindow() {
    val view = pdfView()
    view.setUri(file().toURI().toString())
    assertNull(view.viewer)

    root.addView(view)
    assertTrue(view.viewer is PdfiumView)
  }

  @Test
  fun opensAgainAfterLeavingTheWindow() {
    val view = pdfView()
    root.addView(view)
    view.setUri(file().toURI().toString())
    val first = view.viewer as PdfiumView
    view.pdfiumPageChanged(first, 4)

    root.removeView(view)
    assertTrue(first.hasLeftWindow)
    root.addView(view)
    assertNotSame(first, view.viewer)
    assertEquals(4, view.page)
  }

  @Test
  fun opensAgainAtTheSamePageWhenResized() {
    val view = pdfView()
    root.addView(view)
    view.setUri(file().toURI().toString())
    val first = view.viewer as PdfiumView
    view.pdfiumPageChanged(first, 2)

    view.pdfiumResized(first)
    val second = view.viewer as PdfiumView
    assertNotSame(first, second)
    assertEquals(2, view.page)

    // The view it replaced has nothing more to say.
    view.pdfiumResized(first)
    view.pdfiumPageChanged(first, 7)
    view.pdfiumFailed(first, IllegalStateException("gone"))
    assertSame(second, view.viewer)
    assertEquals(2, view.page)
    assertNull(view.failure)
  }

  @Test
  fun saysWhenTheDocumentDoesNotOpen() {
    val view = pdfView()
    root.addView(view)
    view.setUri(file().toURI().toString())
    val viewer = view.viewer as PdfiumView
    // PDFView recycles itself before it reports the error.
    viewer.recycle()
    view.pdfiumFailed(viewer, IllegalStateException("broken"))
    assertEquals("broken", view.failure)
  }

  /** A view that left the window while it loads fails for want of its renderer, which isn't the document's fault. */
  @Test
  fun ignoresARecycledViewFailing() {
    val view = pdfView()
    root.addView(view)
    view.setUri(file().toURI().toString())
    val viewer = view.viewer as PdfiumView
    root.removeView(view)
    view.pdfiumFailed(viewer, IllegalStateException("no renderer"))
    assertNull(view.failure)
  }

  @Test
  fun startsAtTheFirstPageOfAnotherFile() {
    val view = pdfView()
    root.addView(view)
    view.setUri(file().toURI().toString())
    view.pdfiumPageChanged(view.viewer as PdfiumView, 3)
    view.setUri(file().toURI().toString())
    assertEquals(0, view.page)
  }

  @Test
  fun leavesNothingWhenDestroyed() {
    val view = pdfView()
    root.addView(view)
    view.setUri(file().toURI().toString())
    view.destroy()
    assertNull(view.viewer)
    assertEquals(0, view.childCount)
  }
}
