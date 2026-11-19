package io.robertying.learnx.pdf

import android.net.Uri
import androidx.pdf.PdfDocument
import androidx.pdf.PdfLoader
import androidx.pdf.PdfPasswordException
import org.robolectric.RuntimeEnvironment
import expo.modules.kotlin.AppContext
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import androidx.pdf.view.PdfView as JetpackPdfView

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class PdfViewTest {
  private val loader = mockk<PdfLoader>()
  private val file = Uri.parse("file:///data/a.pdf")

  @Before
  fun setUp() {
    Dispatchers.setMain(UnconfinedTestDispatcher())
  }

  @After
  fun tearDown() {
    Dispatchers.resetMain()
  }

  private fun view() =
    PdfView(
      reactContext(RuntimeEnvironment.getApplication()),
      mockk<AppContext>(relaxed = true),
      PdfBackend.JETPACK,
      { loader },
    )

  private val PdfView.jetpackView
    get() = viewer as JetpackPdfView?

  private fun document() = mockk<PdfDocument>(relaxed = true)

  @Test
  fun definesItsView() {
    PdfModule().definition()
  }

  @Test
  fun showsTheDocumentItOpens() {
    val document = document()
    coEvery { loader.openDocument(file, null) } returns document
    val view = view()
    view.setUri(file.toString())
    assertSame(document, view.document)
    assertSame(document, view.jetpackView?.pdfDocument)
    assertNull(view.failure)
  }

  @Test
  fun opensTheSameFileOnce() {
    coEvery { loader.openDocument(file, null) } returns document()
    val view = view()
    view.setUri(file.toString())
    view.setUri(file.toString())
    coVerify(exactly = 1) { loader.openDocument(file, null) }
  }

  @Test
  fun closesTheDocumentWhenAnotherOpens() {
    val first = document()
    val other = Uri.parse("file:///data/b.pdf")
    coEvery { loader.openDocument(file, null) } returns first
    coEvery { loader.openDocument(other, null) } returns document()
    val view = view()
    view.setUri(file.toString())
    view.setUri(other.toString())
    verify { first.close() }
    assertEquals(other, view.uri)
    assertEquals(1, view.childCount)
    assertSame(view.document, view.jetpackView?.pdfDocument)
  }

  @Test
  fun showsNothingForAURIThatIsNotAFile() {
    val view = view()
    view.setUri("https://example.com/a.pdf")
    assertNull(view.uri)
    assertNull(view.viewer)
    coVerify(exactly = 0) { loader.openDocument(any(), null) }
  }

  @Test
  fun saysWhenThePdfNeedsAPassword() {
    coEvery { loader.openDocument(file, null) } throws PdfPasswordException("locked")
    val view = view()
    view.setUri(file.toString())
    assertEquals("The PDF needs a password.", view.failure)
    assertNull(view.document)
  }

  @Test
  fun saysWhenThePdfDoesNotOpen() {
    coEvery { loader.openDocument(file, null) } throws java.io.IOException()
    val view = view()
    view.setUri(file.toString())
    assertEquals("java.io.IOException", view.failure)
  }

  /** Leaving File detail while the document still opens: it never shows, and is closed once it has opened. */
  @Test
  fun closesADocumentThatOpensAfterDestroy() {
    val pending = CompletableDeferred<PdfDocument>()
    coEvery { loader.openDocument(file, null) } coAnswers { pending.await() }
    val view = view()
    view.setUri(file.toString())
    view.destroy()
    val late = document()
    pending.complete(late)
    verify { late.close() }
    assertNull(view.document)
    assertNull(view.viewer)
    assertNull(view.failure)
  }

  /** Another file chosen while the first still opens: the first is closed once it has opened, and never shows. */
  @Test
  fun closesADocumentThatOpensAfterAnotherIsChosen() {
    val pending = CompletableDeferred<PdfDocument>()
    val other = Uri.parse("file:///data/b.pdf")
    val shown = document()
    coEvery { loader.openDocument(file, null) } coAnswers { pending.await() }
    coEvery { loader.openDocument(other, null) } returns shown
    val view = view()
    view.setUri(file.toString())
    view.setUri(other.toString())
    val late = document()
    pending.complete(late)
    verify { late.close() }
    assertSame(shown, view.document)
  }

  @Test
  fun closesTheDocumentWhenDestroyed() {
    val document = document()
    coEvery { loader.openDocument(file, null) } returns document
    val view = view()
    view.setUri(file.toString())
    view.destroy()
    verify { document.close() }
    assertNull(view.document)
    assertNull(view.viewer)
  }
}
