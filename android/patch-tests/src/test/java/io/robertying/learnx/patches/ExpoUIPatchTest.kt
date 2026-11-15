package io.robertying.learnx.patches

import android.content.Context
import android.os.Looper
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.MutableState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.Density
import com.facebook.react.bridge.DynamicFromObject
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.ViewEvent
import expo.modules.kotlin.views.ComposableScope
import expo.modules.kotlin.views.ShadowNodeProxy
import expo.modules.ui.ModifierRegistry
import io.mockk.Runs
import io.mockk.clearConstructorMockk
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.mockkConstructor
import io.mockk.unmockkConstructor
import io.mockk.verify
import java.time.Duration
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

/**
 * What patches/@expo__ui@58.0.28.patch changes in modifiers on Android: the `semantics` modifier takes `heading`, which marks the
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

/**
 * What patches/@expo__ui@58.0.28.patch changes in a `Host` with `matchContents` on Android: when the size it sends
 * to the layout is dropped and its frame stays 0, it sends the size again.
 *
 * The frame is what Fabric lays the view out at from Yoga; here the parent never lays the host out, and a test calls
 * `layout` itself to stand in for a size that arrived.
 */
@RunWith(RobolectricTestRunner::class)
class ExpoUIHostSizePatchTest {
  private lateinit var host: ViewGroup

  @Before
  fun setUp() {
    mockkConstructor(ShadowNodeProxy::class)
    every { anyConstructed<ShadowNodeProxy>().setStyleSize(any(), any()) } just Runs
    every { anyConstructed<ShadowNodeProxy>().setViewSize(any(), any()) } just Runs
    // The `onLayoutContent` event it also sends needs a React Native context.
    mockkConstructor(ViewEvent::class)
    every { anyConstructed<ViewEvent<Any?>>().invoke(any()) } just Runs

    val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
    val appContext = mockk<AppContext>(relaxed = true) {
      every { currentActivity } returns activity
    }
    host = Class.forName("expo.modules.ui.HostView")
      .getDeclaredConstructor(Context::class.java, AppContext::class.java)
      .apply { isAccessible = true }
      .newInstance(activity, appContext) as ViewGroup
    val props = host.javaClass.getMethod("getProps").invoke(host)
    for (axis in listOf("Horizontal", "Vertical")) {
      @Suppress("UNCHECKED_CAST")
      (props.javaClass.getMethod("getMatchContents$axis").invoke(props) as MutableState<Boolean?>).value = true
    }
    // A parent that, like React Native's views, never lays its children out itself.
    val parent = object : FrameLayout(activity) {
      override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit
    }
    parent.addView(host)
    activity.setContentView(parent)
    // Whatever the empty content reports on its first layout.
    idle(Duration.ofSeconds(5))
    clearConstructorMockk(ShadowNodeProxy::class, answers = false)
  }

  @After
  fun tearDown() {
    unmockkConstructor(ShadowNodeProxy::class, ViewEvent::class)
  }

  private fun idle(duration: Duration) = shadowOf(Looper.getMainLooper()).idleFor(duration)

  /** The content measured at 120 x 48 px, as Compose's `onSizeChanged` reports it (density 1: 120 x 48 dp). */
  private fun contentMeasured() {
    // Its name is mangled, since it takes an `IntSize` (a value class, passed as a Long).
    val dispatch = host.javaClass.declaredMethods.single {
      it.name.startsWith("dispatchOnLayoutContent") && !it.name.contains('$')
    }
    dispatch.isAccessible = true
    dispatch.invoke(host, (120L shl 32) or 48L, Density(1f))
  }

  @Test
  fun aSizeThatNeverReachesTheLayoutIsSentAgain() {
    contentMeasured()
    verify(exactly = 1) { anyConstructed<ShadowNodeProxy>().setStyleSize(120.0, 48.0) }

    idle(Duration.ofMillis(60))
    verify(exactly = 2) { anyConstructed<ShadowNodeProxy>().setStyleSize(120.0, 48.0) }

    // Five more tries at most, with backoff, then it gives up.
    idle(Duration.ofSeconds(10))
    verify(exactly = 6) { anyConstructed<ShadowNodeProxy>().setStyleSize(120.0, 48.0) }
  }

  @Test
  fun aSizeThatReachesTheLayoutIsSentOnce() {
    contentMeasured()
    host.layout(0, 0, 120, 48)

    idle(Duration.ofSeconds(10))
    verify(exactly = 1) { anyConstructed<ShadowNodeProxy>().setStyleSize(any(), any()) }
  }

  @Test
  fun aDetachedHostStopsSendingTheSize() {
    contentMeasured()
    (host.parent as ViewGroup).removeView(host)

    idle(Duration.ofSeconds(10))
    verify(exactly = 1) { anyConstructed<ShadowNodeProxy>().setStyleSize(any(), any()) }
  }
}
