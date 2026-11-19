package io.robertying.learnx.pdf

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import com.github.barteksc.pdfviewer.PDFView

/**
 * AndroidPdfViewer's view, closing its document only after the page it is rendering, and telling when it has to load
 * again ([onResize]).
 *
 * Leaving the window recycles the view, which closes the document on the main thread while the "PDF renderer" thread
 * may still be rendering a page of it; Pdfium then crashes on the closed document. Here the document is hidden from
 * the recycling and closed on the renderer thread instead, behind any render already running there. A render task
 * that starts later finds no document and does nothing.
 */
@SuppressLint("ViewConstructor")
class PdfiumView(context: Context) : PDFView(context, null) {
  init {
    // PDFView's constructor sets it the wrong way round (`setWillNotDraw(!isInEditMode)`), so it would draw no pages.
    setWillNotDraw(false)
  }

  /**
   * Called once the view has settled at a new size. PDFView fits the pages to the size it has when it starts loading,
   * ignores a resize until the document shows and, after that, keeps the pages at the old width when both sides change
   * (rotating), so the document has to load again at the new size.
   */
  var onResize: (() -> Unit)? = null

  private val resized = Runnable { onResize?.invoke() }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    if (oldw > 0 && oldh > 0) {
      // A rotation or a layout switch resizes it several times in a row.
      removeCallbacks(resized)
      postDelayed(resized, RESIZE_SETTLE_MS)
    }
  }

  /** Whether it left the window, which recycles it: it loads nothing more, and a load still running fails. */
  var hasLeftWindow = false
    private set

  override fun onDetachedFromWindow() {
    hasLeftWindow = true
    removeCallbacks(resized)
    val closeDocument = takeDocument()
    if (closeDocument != null) {
      // Before super, which quits the renderer thread; quitting safely still runs what was posted before.
      closeAfterRendering(renderer(), closeDocument)
    }
    super.onDetachedFromWindow()
  }
}

private const val RESIZE_SETTLE_MS = 200L

/** Runs [close] on the [renderer]'s thread, after what it is running; right away when there is no renderer. */
internal fun closeAfterRendering(renderer: Handler?, close: () -> Unit) {
  if (renderer == null || !renderer.post(close)) {
    close()
  }
}
