package io.robertying.learnx.patches

import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import com.facebook.react.bridge.DynamicFromObject
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ComposableScope
import expo.modules.ui.ModifierRegistry
import io.mockk.every
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * What patches/@expo__ui@58.0.28.patch changes on Android: the `semantics` modifier takes `heading`, which marks the
 * element as a heading for TalkBack.
 */
@RunWith(RobolectricTestRunner::class)
class ExpoUIPatchTest {
  @get:Rule
  val compose = createComposeRule()

  // The modifiers only read the application context from it, to convert their parameters.
  private val appContext = mockk<AppContext> {
    every { applicationContext } returns RuntimeEnvironment.getApplication()
    every { runtime } returns mockk(relaxed = true)
  }

  private fun showBox(semantics: Map<String, Any>) {
    val modifier = (mapOf("\$type" to "semantics") + semantics).mapValues { DynamicFromObject(it.value) }
    compose.setContent {
      Box(
        Modifier.testTag("box").then(
          ModifierRegistry.applyModifiers(listOf(modifier), appContext, ComposableScope()) { _, _ -> },
        ),
      )
    }
  }

  private val isHeading = SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)

  @Test
  fun headingMarksTheElementAsAHeading() {
    showBox(mapOf("heading" to true))
    compose.onNodeWithTag("box").assert(isHeading)
  }

  @Test
  fun withoutHeadingTheElementIsNotAHeading() {
    showBox(mapOf("contentDescription" to "Title"))
    compose.onNodeWithTag("box").assert(!isHeading)
  }
}
