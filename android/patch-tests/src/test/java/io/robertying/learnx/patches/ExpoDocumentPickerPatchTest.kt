package io.robertying.learnx.patches

import android.app.Activity
import android.content.Intent
import expo.modules.documentpicker.DocumentPickerModule
import expo.modules.documentpicker.DocumentPickerOptions
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

/**
 * What patches/expo-document-picker@58.0.4.patch changes: files are picked with ACTION_GET_CONTENT, which lists cloud
 * and local providers (and apps) alike, instead of ACTION_OPEN_DOCUMENT.
 */
@RunWith(RobolectricTestRunner::class)
class ExpoDocumentPickerPatchTest {
  private val activity = Robolectric.buildActivity(Activity::class.java).setup().get()

  /** Calls `getDocumentAsync` the way the module's JS function does, past the conversion of its arguments. */
  private fun getDocument(options: DocumentPickerOptions) {
    val appContext = mockk<AppContext>(relaxed = true)
    every { appContext.throwingActivity } returns activity
    val module = spyk(DocumentPickerModule())
    every { module.appContext } returns appContext

    val function = module.definition().asyncFunctions.getValue("getDocumentAsync")
    val body = function.javaClass.getDeclaredField("body").apply { isAccessible = true }
    @Suppress("UNCHECKED_CAST")
    (body.get(function) as (Array<out Any?>, Promise) -> Unit)(arrayOf(options), mockk(relaxed = true))
  }

  @Test
  fun picksWithGetContent() {
    getDocument(DocumentPickerOptions(copyToCacheDirectory = true, type = listOf("*/*"), multiple = true))

    val intent = shadowOf(activity).nextStartedActivityForResult.intent
    assertEquals(Intent.ACTION_GET_CONTENT, intent.action)
    assertTrue(intent.hasCategory(Intent.CATEGORY_OPENABLE))
    assertEquals("*/*", intent.type)
    assertTrue(intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, false))
  }
}
