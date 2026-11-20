package io.robertying.learnx.pdf

import android.app.Activity
import android.os.Looper
import android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction
import android.widget.FrameLayout
import expo.modules.kotlin.AppContext
import io.mockk.mockk
import io.mockk.mockkClass
import io.mockk.spyk
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
import org.robolectric.annotation.Config
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
    view.pdfiumPageChanged(first, 4, 9)

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
    view.pdfiumPageChanged(first, 2, 9)

    view.pdfiumResized(first)
    val second = view.viewer as PdfiumView
    assertNotSame(first, second)
    assertEquals(2, view.page)

    // The view it replaced has nothing more to say.
    view.pdfiumResized(first)
    view.pdfiumPageChanged(first, 7, 9)
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
    assertEquals(PdfFailure.UNREADABLE, view.failure)
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
    view.pdfiumPageChanged(view.viewer as PdfiumView, 3, 9)
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

  @Test
  fun saysTheFileAndThePage() {
    val view = PdfiumView(activity)
    view.title = "Lecture 3"
    // Loading: only the name.
    assertEquals("Lecture 3", view.contentDescription)

    view.pageShown(1, 14)
    assertEquals("Lecture 3, page 2 of 14", view.contentDescription)

    view.title = null
    assertEquals("Page 2 of 14", view.contentDescription)
  }

  @Test
  @Config(qualifiers = "zh")
  fun saysThePageInChinese() {
    val view = PdfiumView(activity)
    view.title = "第三讲"
    view.pageShown(0, 3)
    assertEquals("第三讲，第1页，共3页", view.contentDescription)
  }

  @Test
  fun takesTheNameAndPagesFromItsFile() {
    val view = pdfView()
    view.setTitle("Lecture 3")
    root.addView(view)
    view.setUri(file().toURI().toString())
    val viewer = view.viewer as PdfiumView
    assertEquals("Lecture 3", viewer.contentDescription)

    view.pdfiumPageChanged(viewer, 4, 9)
    view.setTitle("Lecture 4")
    assertEquals("Lecture 4, page 5 of 9", viewer.contentDescription)
  }

  private fun PdfiumView.actions() =
    createAccessibilityNodeInfo().let { info -> info.isScrollable to info.actionList.map { it.id } }

  @Test
  fun offersToTurnThePagesThereAre() {
    val view = PdfiumView(activity)
    // Nothing to turn before the document loads.
    assertFalse(view.actions().first)
    assertTrue(view.actions().second.none { it == SCROLL_FORWARD || it == SCROLL_BACKWARD })

    view.pageShown(0, 3)
    assertTrue(view.actions().first)
    assertTrue(SCROLL_FORWARD in view.actions().second)
    assertFalse(SCROLL_BACKWARD in view.actions().second)

    view.pageShown(2, 3)
    assertFalse(SCROLL_FORWARD in view.actions().second)
    assertTrue(SCROLL_BACKWARD in view.actions().second)

    view.pageShown(0, 1)
    assertFalse(view.actions().first)
  }

  @Test
  fun turnsThePagesForTalkBack() {
    val view = spyk(PdfiumView(activity))
    view.pageShown(1, 3)
    assertTrue(view.performAccessibilityAction(SCROLL_FORWARD, null))
    verify { view.jumpTo(2, true) }
    assertTrue(view.performAccessibilityAction(SCROLL_BACKWARD, null))
    verify { view.jumpTo(0, true) }

    view.pageShown(2, 3)
    assertFalse(view.performAccessibilityAction(SCROLL_FORWARD, null))
    verify(exactly = 0) { view.jumpTo(3, any()) }
  }

  @Test
  fun leavesOtherActionsToTheView() {
    val view = spyk(PdfiumView(activity))
    // Nothing to turn before the document loads.
    view.performAccessibilityAction(SCROLL_FORWARD, null)
    view.pageShown(0, 3)
    view.performAccessibilityAction(AccessibilityAction.ACTION_LONG_CLICK.id, null)
    verify(exactly = 0) { view.jumpTo(any(), any()) }
  }

  @Test
  fun closesWhenReactNativeDestroysTheView() {
    val view = pdfView()
    root.addView(view)
    view.setUri(file().toURI().toString())
    PdfModule().definition().viewManagerDefinitions.values.single().onViewDestroys!!(view)
    assertNull(view.viewer)
  }
}

private val SCROLL_FORWARD = AccessibilityAction.ACTION_SCROLL_FORWARD.id
private val SCROLL_BACKWARD = AccessibilityAction.ACTION_SCROLL_BACKWARD.id
