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
import androidx.glance.layout.Dimension
import androidx.glance.layout.EmittableBox
import androidx.glance.layout.EmittableColumn
import androidx.glance.layout.EmittableRow
import androidx.glance.layout.HeightModifier
import androidx.glance.layout.WidthModifier
import androidx.glance.text.EmittableText
import androidx.glance.text.FontWeight
import androidx.glance.semantics.SemanticsModifier
import androidx.glance.semantics.SemanticsProperties
import com.facebook.react.bridge.DynamicFromObject
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/**
 * What patches/expo-widgets@58.0.29.patch changes on Android: tapping a widget opens the app, an `openUrl` modifier
 * opens a link in the app, an `appWidgetBackground` modifier marks the background, a `contentDescription` modifier
 * sets what TalkBack reads, Expo UI's `weight` modifier makes a Row's or Column's child take the space left, a 500 or
 * 600 font weight draws medium, and layouts get the locale, the text size setting, the launcher's widget corner radius
 * and their size. The library keeps these internal, so they're reached by reflection. (The size is passed only with a
 * layout, which needs the widgets' JS runtime.)
 */
@RunWith(RobolectricTestRunner::class)
class ExpoWidgetsPatchTest {
  private val context = RuntimeEnvironment.getApplication()

  private fun action(modifier: GlanceModifier): StartActivityIntentAction? =
    modifier.foldIn<ActionModifier?>(null) { found, element -> found ?: element as? ActionModifier }
      ?.action as? StartActivityIntentAction

  @Test
  @Config(qualifiers = "zh-rCN")
  fun environmentHasTheLocale() {
    assertEquals("zh-CN", environment()["locale"])
  }

  private fun environment() = Class.forName("expo.modules.widgets.WidgetsUtilsKt")
    .getMethod("getWidgetEnvironment", Context::class.java)
    .invoke(null, context) as Map<*, *>

  @Test
  fun environmentHasTheTextSizeAndCornerRadius() {
    RuntimeEnvironment.setFontScale(1.3f)
    val environment = environment()
    assertEquals(1.3, environment["fontScale"] as Double, 0.001)
    val radius = context.resources.getDimension(android.R.dimen.system_app_widget_background_radius) /
      context.resources.displayMetrics.density
    assertEquals(radius.toDouble(), environment["cornerRadius"] as Double, 0.001)
  }

  @Test
  @Config(sdk = [30])
  fun environmentHasNoCornerRadiusBeforeAndroid12() {
    assertNull(environment()["cornerRadius"])
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
    // A widget with no layout, so its content is made without the widgets' JS runtime.
    val widget = widgetClass.getDeclaredConstructor(String::class.java).apply { isAccessible = true }
      .newInstance("NoLayout")
    // DpSize is an inline class, so the method's name is mangled and the size is a Long.
    val provideRoot = widgetClass.methods.single { it.name.startsWith("provideRoot") }
    val root = provideRoot.invoke(widget, context, AppWidgetId(1), Bundle(), 0L) as Emittable

    assertTrue(root is EmittableBox)
    assertEquals(launcher, action(root.modifier)?.intent?.component)
    // What it wraps: the widget's content (the error saying there's no layout).
    assertEquals(1, (root as EmittableBox).children.size)
  }

  /** Converts one modifier as a layout passes it (`{ $type, ...params }`). */
  private fun peekModifier(vararg entries: Pair<String, Any>): GlanceModifier {
    val tree = Class.forName("expo.modules.widgets.ExpoWidgetEmittableTreeKt")
    val converterContextClass = Class.forName("expo.modules.widgets.WidgetConverterContext")
    // Its size is a DpSize (a Long); Kotlin adds a synthetic constructor beside it.
    val converterContext = converterContextClass.declaredConstructors.single { !it.isSynthetic }
      .apply { isAccessible = true }
      .newInstance(context, 0L)
    // The one for a single modifier (a map), not for a list of them.
    val toPeekModifier = tree.declaredMethods
      .single { it.name == "toPeekModifier" && it.parameterTypes.first() == Map::class.java }
      .apply { isAccessible = true }
    return toPeekModifier.invoke(
      null,
      entries.associate { (key, value) -> key to DynamicFromObject(value) },
      converterContext,
    ) as GlanceModifier
  }

  @Test
  fun appWidgetBackgroundModifierMarksTheBackground() {
    val modifier = peekModifier("\$type" to "appWidgetBackground")
    assertTrue(modifier.any { it.javaClass.name == "androidx.glance.appwidget.AppWidgetBackgroundModifier" })
  }

  @Test
  fun openUrlModifierOpensTheLinkInTheApp() {
    val modifier = peekModifier("\$type" to "openUrl", "url" to "learnx://assignment/1")

    val intent = checkNotNull(action(modifier)).intent
    assertEquals(Intent.ACTION_VIEW, intent.action)
    assertEquals(Uri.parse("learnx://assignment/1"), intent.data)
    assertEquals(context.packageName, intent.`package`)
  }

  @Test
  fun contentDescriptionModifierSetsWhatTalkBackReads() {
    val modifier = peekModifier("\$type" to "contentDescription", "text" to "Assignment, 3 PM, Course")
    val semantics = checkNotNull(
      modifier.foldIn<SemanticsModifier?>(null) { found, element -> found ?: element as? SemanticsModifier },
    )
    assertEquals(
      listOf("Assignment, 3 PM, Course"),
      semantics.configuration.getOrNull(SemanticsProperties.ContentDescription),
    )
  }

  /** A view as a layout's element tree has it: its type and props, with its children among them. */
  private fun node(type: String, vararg props: Pair<String, Any>, children: List<ReadableMap> = emptyList()) =
    JavaOnlyMap.of(
      "type", type,
      "props", JavaOnlyMap().apply {
        props.forEach { (key, value) -> putDynamic(key, value) }
        if (children.isNotEmpty()) {
          putArray("children", JavaOnlyArray.from(children))
        }
      },
    )

  private fun JavaOnlyMap.putDynamic(key: String, value: Any) = when (value) {
    is String -> putString(key, value)
    is ReadableMap -> putMap(key, value)
    is List<*> -> putArray(key, JavaOnlyArray.from(value))
    else -> error("Unexpected $value")
  }

  private val weight = listOf(JavaOnlyMap.of("\$type", "weight", "weight", 1.0))

  /** Converts a layout's element tree as a widget does, and returns what it wraps. */
  private fun peekRoot(node: ReadableMap): Emittable {
    val tree = Class.forName("expo.modules.widgets.ExpoWidgetEmittableTreeKt")
    val source = Class.forName("expo.modules.widgets.InteractionSource\$Widget")
      .getDeclaredConstructor(String::class.java).apply { isAccessible = true }
      .newInstance("Test")
    // DpSize is an inline class, so the method's name is mangled and the size is a Long.
    val toPeekRoot = tree.declaredMethods.single { it.name.startsWith("toPeekRoot") }
      .apply { isAccessible = true }
    val root = toPeekRoot.invoke(null, node, context, source, 0L) as EmittableBox
    return root.children.single()
  }

  private fun expandsWidth(modifier: GlanceModifier) =
    modifier.any { it is WidthModifier && it.width == Dimension.Expand }

  private fun expandsHeight(modifier: GlanceModifier) =
    modifier.any { it is HeightModifier && it.height == Dimension.Expand }

  @Test
  fun weightModifierTakesTheSpaceLeftInARow() {
    val row = peekRoot(
      node(
        "RowView",
        children = listOf(
          node("TextView", "text" to "Course", "modifiers" to weight),
          node("TextView", "text" to "08:00"),
        ),
      ),
    ) as EmittableRow
    val (course, time) = row.children
    assertTrue(expandsWidth(course.modifier))
    assertFalse(expandsHeight(course.modifier))
    assertFalse(expandsWidth(time.modifier))
  }

  @Test
  fun weightModifierTakesTheSpaceLeftInAColumn() {
    val column = peekRoot(
      node(
        "ColumnView",
        children = listOf(
          node("SpacerView", "modifiers" to weight),
          node("TextView", "text" to "Course"),
        ),
      ),
    ) as EmittableColumn
    val (spacer, text) = column.children
    assertTrue(expandsHeight(spacer.modifier))
    assertFalse(expandsWidth(spacer.modifier))
    assertFalse(expandsHeight(text.modifier))
  }

  @Test
  fun mediumFontWeightsDrawMedium() {
    fun weightOf(value: String) = (peekRoot(node("TextView", "text" to "A", "fontWeight" to value)) as EmittableText)
      .style?.fontWeight
    assertEquals(FontWeight.Medium, weightOf("500"))
    assertEquals(FontWeight.Medium, weightOf("600"))
    assertEquals(FontWeight.Normal, weightOf("400"))
    assertEquals(FontWeight.Bold, weightOf("bold"))
  }
}
