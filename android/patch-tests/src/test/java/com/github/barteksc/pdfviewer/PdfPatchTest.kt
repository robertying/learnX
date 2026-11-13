// In the viewer's package, like RecycleSafeRendering, to reach PDFView's package-private state.
package com.github.barteksc.pdfviewer

import android.os.Looper
import android.os.Message
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * What patches/react-native-pdf@7.0.5.patch changes on Android: recycling the view (e.g. leaving the screen while
 * pages render) disposes the document only after the render running on the renderer thread, and tasks that come in
 * once it's recycled are dropped. Closing the document under a render crashed in Pdfium.
 */
@RunWith(RobolectricTestRunner::class)
class PdfPatchTest {
  @Test
  fun disposesTheDocumentOnTheRendererThread() {
    val view = mockk<PDFView>(relaxed = true)
    val pdfFile = mockk<PdfFile>(relaxed = true)
    val handler = mockk<RenderingHandler>(relaxed = true)
    val posted = slot<Runnable>()
    every { handler.post(capture(posted)) } returns true
    view.pdfFile = pdfFile
    view.renderingHandler = handler

    var documentSeenBySuperRecycle: PdfFile? = pdfFile
    RecycleSafeRendering.recycle(view) { documentSeenBySuperRecycle = view.pdfFile }

    // super.recycle() didn't get the document to dispose right away.
    assertNull(documentSeenBySuperRecycle)
    verify(exactly = 0) { pdfFile.dispose() }
    verify { handler.stop() }

    // The renderer thread disposes it once it's done with the current render.
    posted.captured.run()
    verify { pdfFile.dispose() }
  }

  @Test
  fun disposesAtOnceWhenTheRendererIsGone() {
    val view = mockk<PDFView>(relaxed = true)
    val pdfFile = mockk<PdfFile>(relaxed = true)
    val handler = mockk<RenderingHandler>(relaxed = true)
    every { handler.post(any()) } returns false
    view.pdfFile = pdfFile
    view.renderingHandler = handler

    RecycleSafeRendering.recycle(view) {}
    verify { pdfFile.dispose() }
  }

  @Test
  fun dropsRenderTasksOnceStopped() {
    val view = mockk<PDFView>(relaxed = true)
    view.renderingHandler = RenderingHandler(Looper.getMainLooper(), view)
    RecycleSafeRendering.install(view)
    val guarded = view.renderingHandler
    assertTrue(guarded.javaClass.simpleName == "GuardedRenderingHandler")

    guarded.stop()
    // A task the recycled view would render: with no document, rendering it would throw.
    guarded.handleMessage(Message.obtain(guarded, RenderingHandler.MSG_RENDER_TASK, null))
  }
}
