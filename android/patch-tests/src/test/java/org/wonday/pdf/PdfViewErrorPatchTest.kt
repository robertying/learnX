package org.wonday.pdf

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkAll
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * What patches/react-native-pdf@7.0.5.patch changes in PdfView.onError: an error without a message (Pdfium can throw
 * one) is reported to JS like any other instead of crashing the app on `getMessage().contains(...)`.
 */
@RunWith(RobolectricTestRunner::class)
class PdfViewErrorPatchTest {
  private val map = JavaOnlyMap()
  private val dispatcher = mockk<EventDispatcher>(relaxed = true)
  private val view = mockk<PdfView>(relaxed = true)

  @Before
  fun setUp() {
    // Arguments.createMap() makes a native map, which needs the React Native libraries loaded.
    mockkStatic(Arguments::class, UIManagerHelper::class)
    every { Arguments.createMap() } returns map
    every { UIManagerHelper.getEventDispatcherForReactTag(any(), any()) } returns dispatcher
    every { UIManagerHelper.getSurfaceId(any<android.view.View>()) } returns 1
    every { view.context } returns mockk<ThemedReactContext>(relaxed = true)
    every { view.id } returns 7
    every { view.onError(any()) } answers { callOriginal() }
  }

  @After
  fun tearDown() = unmockkAll()

  @Test
  fun reportsAnErrorWithoutAMessage() {
    view.onError(IllegalStateException())

    assertEquals("error|java.lang.IllegalStateException", map.getString("message"))
    val event = slot<Event<*>>()
    verify { dispatcher.dispatchEvent(capture(event)) }
    assertEquals(7, event.captured.viewTag)
  }

  @Test
  fun keepsTheMessagesItReportedBefore() {
    view.onError(RuntimeException("file not in PDF format or corrupted"))
    assertEquals("error|file not in PDF format or corrupted", map.getString("message"))

    view.onError(RuntimeException("Password required or incorrect password"))
    assertEquals("error|Password required or incorrect password.", map.getString("message"))
  }
}
