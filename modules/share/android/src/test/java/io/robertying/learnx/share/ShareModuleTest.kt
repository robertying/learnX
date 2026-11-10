package io.robertying.learnx.share

import android.app.Activity
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.AppContext
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.Runs
import io.mockk.spyk
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

private val fileUri: Uri = Uri.parse("content://com.android.providers.downloads/document/1")

private fun share(type: String? = "application/pdf", stream: Uri? = fileUri, text: String? = null) =
  Intent(Intent.ACTION_SEND).apply {
    type?.let { setType(it) }
    stream?.let { putExtra(Intent.EXTRA_STREAM, it) }
    text?.let { putExtra(Intent.EXTRA_TEXT, it) }
  }

@RunWith(RobolectricTestRunner::class)
class TakeTest {
  @Test
  fun takesASharedFile() {
    val intent = share()
    assertEquals(
      mapOf("kind" to "file", "uri" to fileUri.toString(), "mimeType" to "application/pdf"),
      ShareModule.take(intent),
    )
    // Read once.
    assertFalse(intent.hasExtra(Intent.EXTRA_STREAM))
    assertNull(ShareModule.take(intent))
  }

  @Test
  fun defaultsTheMimeType() {
    assertEquals("application/octet-stream", ShareModule.take(share(type = null))?.get("mimeType"))
  }

  @Test
  fun prefersTheFileToText() {
    val intent = share(type = "text/plain", text = "notes")
    assertEquals("file", ShareModule.take(intent)?.get("kind"))
    assertFalse(intent.hasExtra(Intent.EXTRA_TEXT))
  }

  @Test
  fun refusesTextWithoutAFile() {
    val intent = share(type = "text/plain", stream = null, text = "https://learn.tsinghua.edu.cn")
    assertEquals(mapOf("kind" to "unsupported"), ShareModule.take(intent))
    assertFalse(intent.hasExtra(Intent.EXTRA_TEXT))
  }

  @Test
  fun ignoresAShareWithNothing() {
    assertNull(ShareModule.take(share(stream = null)))
  }

  @Test
  fun ignoresOtherIntents() {
    val intent = Intent(Intent.ACTION_VIEW).putExtra(Intent.EXTRA_STREAM, fileUri)
    assertNull(ShareModule.take(intent))
    // Left as it was.
    assertEquals(fileUri, intent.extras?.get(Intent.EXTRA_STREAM))
  }

  @Test
  @Config(sdk = [31])
  fun readsTheFileOnOlderAndroid() {
    assertEquals(fileUri.toString(), ShareModule.take(share())?.get("uri"))
  }
}

@RunWith(RobolectricTestRunner::class)
class ShareModuleTest {
  private val activity = mockk<Activity>(relaxed = true)
  private val appContext = mockk<AppContext> { every { currentActivity } returns activity }
  private val module = spyk(ShareModule()) {
    every { appContext } returns this@ShareModuleTest.appContext
    every { sendEvent(any(), any<Map<String, Any?>>()) } just Runs
  }

  @Test
  fun definesItsFunctions() {
    ShareModule().definition()
  }

  @Test
  fun takesTheIntentThatLaunchedTheApp() {
    every { activity.intent } returns share()
    assertEquals("file", module.takeSharedItem()?.get("kind"))
  }

  @Test
  fun takesNothingWithoutAnActivity() {
    every { appContext.currentActivity } returns null
    assertNull(module.takeSharedItem())
  }

  @Test
  fun sendsLaterShares() {
    val intent = share()
    module.onNewIntent(intent)
    verify { module.sendEvent("onShare", match<Map<String, Any?>> { it["uri"] == fileUri.toString() }) }
    verify { activity.intent = intent }
  }

  @Test
  fun keepsOtherIntentsWithoutSending() {
    val intent = Intent(Intent.ACTION_VIEW)
    module.onNewIntent(intent)
    verify(exactly = 0) { module.sendEvent(any(), any<Map<String, Any?>>()) }
    verify { activity.intent = intent }
  }

  @Test
  fun sendsWithoutAnActivity() {
    every { appContext.currentActivity } returns null
    module.onNewIntent(share())
    verify { module.sendEvent("onShare", any<Map<String, Any?>>()) }
  }
}
