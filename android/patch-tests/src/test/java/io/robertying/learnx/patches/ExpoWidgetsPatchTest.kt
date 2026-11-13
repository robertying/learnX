package io.robertying.learnx.patches

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Bundle
import androidx.glance.Emittable
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionModifier
import androidx.glance.appwidget.AppWidgetId
import androidx.glance.appwidget.action.StartActivityIntentAction
import androidx.glance.layout.EmittableBox
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.DynamicFromObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/**
 * What patches/expo-widgets@58.0.27.patch changes on Android: tapping a widget opens the app, an `openUrl` modifier
 * opens a link in the app, and layouts get the locale. The library keeps all three internal, so they're reached by
 * reflection.
 */
@RunWith(RobolectricTestRunner::class)
class ExpoWidgetsPatchTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()

  private fun action(modifier: GlanceModifier): StartActivityIntentAction? =
    modifier.foldIn<ActionModifier?>(null) { found, element -> found ?: element as? ActionModifier }
      ?.action as? StartActivityIntentAction

  @Test
  @Config(qualifiers = "zh-rCN")
  fun environmentHasTheLocale() {
    val environment = Class.forName("expo.modules.widgets.WidgetsUtilsKt")
      .getMethod("getWidgetEnvironment", Context::class.java)
      .invoke(null, context) as Map<*, *>
    assertEquals("zh-CN", environment["locale"])
  }

  @Test
  fun tappingTheWidgetOpensTheApp() {
    // The app's launcher activity.
    val launcher = ComponentName(context, Activity::class.java)
    shadowOf(context.packageManager).apply {
      addActivityIfNotPresent(launcher)
      addIntentFilterForActivity(
        launcher,
        IntentFilter(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) },
      )
    }

    val widgetClass = Class.forName("expo.modules.widgets.ExpoWidgetsPeekWidget")
    val widget = widgetClass.getDeclaredConstructor(String::class.java).apply { isAccessible = true }
      .newInstance("Deadlines")
    // DpSize is an inline class, so the method's name is mangled and the size is a Long.
    val provideRoot = widgetClass.methods.single { it.name.startsWith("provideRoot") }
    val root = provideRoot.invoke(widget, context, AppWidgetId(1), Bundle(), 0L) as Emittable

    assertTrue(root is EmittableBox)
    assertEquals(launcher, action(root.modifier)?.intent?.component)
    // What it wraps: the widget's content (an error, as no layout was sent here).
    assertEquals(1, (root as EmittableBox).children.size)
  }

  @Test
  fun openUrlModifierOpensTheLinkInTheApp() {
    val tree = Class.forName("expo.modules.widgets.ExpoWidgetEmittableTreeKt")
    val converterContextClass = Class.forName("expo.modules.widgets.WidgetConverterContext")
    val converterContext = converterContextClass.declaredConstructors.single().apply { isAccessible = true }
      .newInstance(context, 0L)
    val toPeekModifier = tree.declaredMethods.single { it.name == "toPeekModifier" }.apply { isAccessible = true }

    val modifier = toPeekModifier.invoke(
      null,
      mapOf("\$type" to DynamicFromObject("openUrl"), "url" to DynamicFromObject("learnx://assignment/1")),
      converterContext,
    ) as GlanceModifier

    val intent = checkNotNull(action(modifier)).intent
    assertEquals(Intent.ACTION_VIEW, intent.action)
    assertEquals(Uri.parse("learnx://assignment/1"), intent.data)
    assertEquals(context.packageName, intent.`package`)
  }
}
