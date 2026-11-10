package io.robertying.learnx.share

import android.content.Intent
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Hands files shared to learnX (a SEND intent to MainActivity) to JS: the intent that launched the activity through
 * `takeSharedItem`, later ones as `onShare` events. Each share is read once: its extras are removed after.
 */
class ShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LearnXShare")

    Events("onShare")

    Function("takeSharedItem") { takeSharedItem() }

    Function("getSharedFilesDirectory") { null as String? }

    OnNewIntent { intent -> onNewIntent(intent) }
  }

  internal fun takeSharedItem(): Map<String, String>? = appContext.currentActivity?.intent?.let(::take)

  internal fun onNewIntent(intent: Intent) {
    take(intent)?.let { sendEvent("onShare", it) }
    // Later reads of the activity's intent see this one, already taken.
    appContext.currentActivity?.intent = intent
  }

  internal companion object {
    fun take(intent: Intent): Map<String, String>? {
      if (intent.action != Intent.ACTION_SEND) {
        return null
      }
      val uri = intent.stream()
      val hasText = intent.hasExtra(Intent.EXTRA_TEXT)
      intent.removeExtra(Intent.EXTRA_STREAM)
      intent.removeExtra(Intent.EXTRA_TEXT)
      return when {
        uri != null -> mapOf(
          "kind" to "file",
          "uri" to uri.toString(),
          "mimeType" to (intent.type ?: "application/octet-stream"),
        )
        // learnX takes text/* shares for text files; text without a file can't be attached.
        hasText -> mapOf("kind" to "unsupported")
        else -> null
      }
    }

    @Suppress("DEPRECATION")
    private fun Intent.stream(): Uri? =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
      } else {
        getParcelableExtra(Intent.EXTRA_STREAM)
      }
  }
}
