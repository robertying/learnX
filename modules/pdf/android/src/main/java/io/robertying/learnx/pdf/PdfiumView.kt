package io.robertying.learnx.pdf

import android.annotation.SuppressLint
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction
import com.github.barteksc.pdfviewer.PDFView

/**
 * AndroidPdfViewer's view, closing its document only after the page it is rendering, telling when it has to load
 * again ([onResize]), and telling TalkBack what it shows.
 *
 * Leaving the window recycles the view, which closes the document on the main thread while the "PDF renderer" thread
 * may still be rendering a page of it; Pdfium then crashes on the closed document. Here the document is hidden from
 * the recycling and closed on the renderer thread instead, behind any render already running there. A render task
 * that starts later finds no document and does nothing.
 *
 * PDFView draws its pages on a canvas, with nothing for TalkBack: here the view says the file and the page it is on
 * ("Lecture 3, page 2 of 14"), and TalkBack's scroll actions turn the pages.
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

  /** The file's name, said with the page. */
  var title: String? = null
    set(value) {
      field = value
      describe()
    }

  /** The page shown (from 0) and how many the document has, once it is loaded. */
  private var shown: Pair<Int, Int>? = null

  /** The document shows [page] (from 0) of [pageCount]. */
  fun pageShown(page: Int, pageCount: Int) {
    shown = page to pageCount
    describe()
  }

  private fun describe() {
    val name = title?.takeIf { it.isNotBlank() }
    val (page, pageCount) = shown ?: (0 to 0)
    contentDescription =
      when {
        pageCount == 0 -> name
        name == null -> resources.getString(R.string.pdf_page, page + 1, pageCount)
        else -> resources.getString(R.string.pdf_titled_page, name, page + 1, pageCount)
      }
  }

  override fun onInitializeAccessibilityNodeInfo(info: AccessibilityNodeInfo) {
    super.onInitializeAccessibilityNodeInfo(info)
    val (page, pageCount) = shown ?: return
    info.isScrollable = pageCount > 1
    if (page > 0) {
      info.addAction(AccessibilityAction.ACTION_SCROLL_BACKWARD)
    }
    if (page < pageCount - 1) {
      info.addAction(AccessibilityAction.ACTION_SCROLL_FORWARD)
    }
  }

  override fun performAccessibilityAction(action: Int, arguments: Bundle?): Boolean {
    val (page, pageCount) = shown ?: return super.performAccessibilityAction(action, arguments)
    val target =
      when (action) {
        AccessibilityNodeInfo.ACTION_SCROLL_FORWARD -> page + 1
        AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD -> page - 1
        else -> return super.performAccessibilityAction(action, arguments)
      }
    if (target !in 0 until pageCount) {
      return false
    }
    // PDFView says the new page (onPageChange), which describes it again.
    jumpTo(target, true)
    return true
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
