package io.robertying.learnx.pdf

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.pdf.PdfDocument
import androidx.pdf.PdfLoader
import androidx.pdf.PdfPasswordException
import androidx.pdf.SandboxedPdfLoader
import com.github.barteksc.pdfviewer.listener.OnErrorListener
import com.github.barteksc.pdfviewer.listener.OnPageChangeListener
import com.github.barteksc.pdfviewer.util.FitPolicy
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.isActive
import kotlinx.coroutines.NonCancellable
import androidx.pdf.view.PdfView as JetpackPdfView
import io.legere.pdfiumandroid.api.PdfPasswordException as PdfiumPasswordException

/** A downloaded PDF, for File detail. */
class PdfModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LearnXPdf")

    View(PdfView::class) {
      Events("onError")

      Prop("uri") { view: PdfView, uri: String -> view.setUri(uri) }

      Prop("title") { view: PdfView, title: String? -> view.setTitle(title) }

      OnViewDestroys { view: PdfView -> view.destroy() }
    }
  }
}

/** Why a PDF didn't open, as `onError`'s `reason` says it. */
internal enum class PdfFailure(val reason: String) {
  /** It is encrypted with a password. */
  PASSWORD("password"),

  /** It is damaged or isn't a PDF. */
  UNREADABLE("unreadable");

  companion object {
    fun of(error: Throwable): PdfFailure =
      when (error) {
        is PdfPasswordException, is PdfiumPasswordException -> PASSWORD
        else -> UNREADABLE
      }
  }
}

/**
 * One local PDF, its pages one under another and fitted to the view's width, with the viewer's own scrolling and
 * zoom. Where Jetpack's viewer renders with the platform's newer PDF renderer ([PdfBackend]), it draws the document
 * in an isolated process (`SandboxedPdfLoader`), so a crash in the renderer ends that process, not the app. Elsewhere
 * AndroidPdfViewer draws it with Pdfium ([PdfiumView]).
 *
 * Leaving the window isn't the end: Android detaches a screen's views while another screen covers it. Jetpack's
 * viewer keeps its document and place; AndroidPdfViewer recycles its document, so it opens again at the page it was
 * on when it comes back.
 */
@SuppressLint("ViewConstructor")
class PdfView @JvmOverloads constructor(
  context: Context,
  appContext: AppContext,
  internal val backend: PdfBackend = PdfBackend.forDevice(),
  private val makeLoader: () -> PdfLoader = { SandboxedPdfLoader(context, Dispatchers.IO) },
) : ExpoView(context, appContext) {
  private val onError by EventDispatcher<Map<String, String>>()

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var opening: Job? = null
  private val loader by lazy(makeLoader)

  /** The viewer showing the document: Jetpack's or AndroidPdfViewer's, a new one for each document. */
  internal var viewer: View? = null
    private set

  internal var uri: Uri? = null
    private set

  /** The Jetpack document shown. */
  internal var document: PdfDocument? = null
    private set

  /** The page AndroidPdfViewer last showed, to open at when it comes back. */
  internal var page = 0
    private set

  /** The file's name, which AndroidPdfViewer's view says to TalkBack with the page (Jetpack's says its own). */
  internal var title: String? = null
    private set

  /** Why the document didn't open, as sent to `onError`. */
  internal var failure: PdfFailure? = null
    private set

  // The viewers lay out and draw their pages themselves, outside React Native's layout.
  override val shouldUseAndroidLayout = true

  /** A `file:` URI; anything else shows nothing. */
  fun setUri(value: String) {
    val newUri = Uri.parse(value).takeIf { it.scheme == "file" }
    if (newUri == uri) {
      return
    }
    uri = newUri
    page = 0
    open()
  }

  fun setTitle(value: String?) {
    title = value
    (viewer as? PdfiumView)?.title = value
  }

  private fun open() {
    close()
    val uri = uri ?: return
    when (backend) {
      PdfBackend.JETPACK -> openWithJetpack(uri)
      PdfBackend.PDFIUM -> openWithPdfium(uri)
    }
  }

  private fun show(view: View) {
    viewer = view
    addView(view, LayoutParams(MATCH_PARENT, MATCH_PARENT))
  }

  private fun openWithJetpack(uri: Uri) {
    opening = scope.launch {
      try {
        // Not cancelled midway: the service may have opened the document by then, and only closing it here frees it.
        val opened = withContext(NonCancellable) { loader.openDocument(uri) }
        if (!isActive) {
          // Another file, or none, since.
          opened.close()
          return@launch
        }
        document = opened
        show(JetpackPdfView(context).apply { pdfDocument = opened })
      } catch (e: Exception) {
        // Only for the file still wanted.
        if (isActive) fail(PdfFailure.of(e))
      }
    }
  }

  private fun openWithPdfium(uri: Uri) {
    // Leaving the window recycles AndroidPdfViewer's view: it opens once this view is in one (onAttachedToWindow).
    if (!isAttachedToWindow) {
      return
    }
    val view = PdfiumView(context)
    view.title = title
    view.onResize = { pdfiumResized(view) }
    show(view)
    view
      .fromFile(File(requireNotNull(uri.path)))
      .defaultPage(page)
      .pageFitPolicy(FitPolicy.WIDTH)
      .enableAnnotationRendering(true)
      .onPageChange(
        object : OnPageChangeListener {
          override fun onPageChanged(page: Int, pageCount: Int) = pdfiumPageChanged(view, page, pageCount)
        },
      )
      .onError(
        object : OnErrorListener {
          override fun onError(t: Throwable) = pdfiumFailed(view, t)
        },
      )
      .load()
  }

  /** AndroidPdfViewer's [view] settled at a new size, which it can't fit its pages to: load the document again. */
  internal fun pdfiumResized(view: PdfiumView) {
    if (viewer === view) {
      open()
    }
  }

  internal fun pdfiumPageChanged(view: PdfiumView, page: Int, pageCount: Int) {
    if (viewer === view) {
      this.page = page
      view.pageShown(page, pageCount)
    }
  }

  internal fun pdfiumFailed(view: PdfiumView, error: Throwable) {
    // A view that left the window while it loads still finishes loading, and fails for want of its renderer.
    if (viewer === view && !view.hasLeftWindow) {
      fail(PdfFailure.of(error))
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // AndroidPdfViewer's view waits for a window, and one that left a window recycled its document and loads no other.
    if (backend == PdfBackend.PDFIUM && uri != null && (viewer as? PdfiumView)?.hasLeftWindow != false) {
      open()
    }
  }

  private fun fail(failure: PdfFailure) {
    this.failure = failure
    onError(mapOf("reason" to failure.reason))
  }

  private fun close() {
    opening?.cancel()
    opening = null
    failure = null
    // AndroidPdfViewer's view closes its document as it leaves the window, once it is done rendering (PdfiumView).
    viewer?.let(::removeView)
    viewer = null
    document?.close()
    document = null
  }

  /** The view is gone for good. */
  internal fun destroy() {
    close()
    scope.cancel()
  }
}
