// AndroidPdfViewer keeps its document and renderer `internal`, and its prebuilt classes can't be patched.
@file:Suppress("INVISIBLE_REFERENCE", "INVISIBLE_MEMBER")

package io.robertying.learnx.pdf

import android.os.Handler
import com.github.barteksc.pdfviewer.PDFView

internal fun PDFView.renderer(): Handler? = renderingHandler

/**
 * Takes the view's document away from it, so recycling the view doesn't close it, and returns what closes it, or
 * null when there is none.
 */
internal fun PDFView.takeDocument(): (() -> Unit)? {
  val document = pdfFile ?: return null
  pdfFile = null
  return { document.dispose() }
}
