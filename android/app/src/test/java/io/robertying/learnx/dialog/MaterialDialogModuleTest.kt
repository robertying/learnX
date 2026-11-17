package io.robertying.learnx.dialog

import android.content.DialogInterface
import android.os.Looper
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.FragmentActivity
import com.facebook.fbreact.specs.NativeDialogManagerAndroidSpec
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.material.color.MaterialColors
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import io.robertying.learnx.R
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

/** Records the arguments of each call, as React Native's callbacks get them. */
private class RecordingCallback : Callback {
  val calls = mutableListOf<List<Any?>>()

  override fun invoke(vararg args: Any?) {
    calls.add(args.toList())
  }
}

@RunWith(RobolectricTestRunner::class)
class ArgumentsTest {
  @Test
  fun takesTheTextsButtonsAndDestructiveButtons() {
    val bundle =
        MaterialDialogModule.arguments(
            JavaOnlyMap.of(
                "title", "Delete?",
                "message", "It can't be undone.",
                "buttonPositive", "Delete",
                "buttonNegative", "Cancel",
                "buttonNeutral", "Later",
                "destructiveButtons", JavaOnlyArray.of("positive", "unknown", "neutral"),
            ))
    assertEquals("Delete?", bundle.getString(MaterialAlertFragment.ARG_TITLE))
    assertEquals("It can't be undone.", bundle.getString(MaterialAlertFragment.ARG_MESSAGE))
    assertEquals("Delete", bundle.getString(MaterialAlertFragment.ARG_BUTTON_POSITIVE))
    assertEquals("Cancel", bundle.getString(MaterialAlertFragment.ARG_BUTTON_NEGATIVE))
    assertEquals("Later", bundle.getString(MaterialAlertFragment.ARG_BUTTON_NEUTRAL))
    // A style it doesn't know is left out.
    assertArrayEquals(
        intArrayOf(DialogInterface.BUTTON_POSITIVE, DialogInterface.BUTTON_NEUTRAL),
        bundle.getIntArray(MaterialAlertFragment.ARG_DESTRUCTIVE_BUTTONS),
    )
    assertNull(bundle.getCharSequenceArray(MaterialAlertFragment.ARG_ITEMS))
  }

  @Test
  fun takesAListOfItems() {
    val bundle =
        MaterialDialogModule.arguments(JavaOnlyMap.of("items", JavaOnlyArray.of("One", "Two")))
    assertArrayEquals(
        arrayOf<CharSequence>("One", "Two"),
        bundle.getCharSequenceArray(MaterialAlertFragment.ARG_ITEMS),
    )
    assertFalse(bundle.containsKey(MaterialAlertFragment.ARG_TITLE))
    assertNull(bundle.getIntArray(MaterialAlertFragment.ARG_DESTRUCTIVE_BUTTONS))
  }
}

@RunWith(RobolectricTestRunner::class)
class MaterialDialogModuleTest {
  private lateinit var activity: FragmentActivity
  private lateinit var context: ReactApplicationContext
  private lateinit var module: MaterialDialogModule
  private var currentActivity: FragmentActivity? = null
  private var active = true

  @Before
  fun setUp() {
    // The app's Material 3 theme, which the launch theme hands over to.
    val controller = Robolectric.buildActivity(FragmentActivity::class.java)
    controller.get().setTheme(R.style.AppTheme)
    activity = controller.setup().get()
    currentActivity = activity
    context = mockk(relaxed = true)
    every { context.currentActivity } answers { currentActivity }
    every { context.hasActiveReactInstance() } answers { active }
    module = MaterialDialogModule(context)
    module.initialize()
    module.onHostResume()
  }

  private fun idle() = shadowOf(Looper.getMainLooper()).idle()

  private fun fragments() =
      activity.supportFragmentManager.fragments.filterIsInstance<MaterialAlertFragment>()

  private fun shownDialog(): AlertDialog {
    idle()
    return fragments().single().requireDialog() as AlertDialog
  }

  private fun show(options: JavaOnlyMap): RecordingCallback {
    val action = RecordingCallback()
    module.showAlert(options, RecordingCallback(), action)
    idle()
    return action
  }

  @Test
  fun listensToTheAppComingAndGoingWhileAlive() {
    verify { context.addLifecycleEventListener(module) }
    module.onHostDestroy()
    module.invalidate()
    verify { context.removeLifecycleEventListener(module) }
  }

  @Test
  fun exportsReactNativesConstants() {
    assertEquals(
        mapOf(
            "buttonClicked" to "buttonClicked",
            "dismissed" to "dismissed",
            "buttonPositive" to DialogInterface.BUTTON_POSITIVE,
            "buttonNegative" to DialogInterface.BUTTON_NEGATIVE,
            "buttonNeutral" to DialogInterface.BUTTON_NEUTRAL,
        ),
        module.constants,
    )
  }

  @Test
  fun failsWithoutAnActivity() {
    currentActivity = null
    val error = RecordingCallback()
    module.showAlert(JavaOnlyMap.of("title", "Hi"), error, RecordingCallback())
    assertEquals(
        listOf(listOf<Any?>("Tried to show an alert while not attached to an Activity")),
        error.calls,
    )
  }

  @Test
  fun showsAMaterialDialogAndRepliesOnceWithTheButton() {
    val action =
        show(
            JavaOnlyMap.of(
                "title", "Delete?",
                "message", "It can't be undone.",
                "buttonPositive", "Delete",
                "buttonNegative", "Cancel",
                "destructiveButtons", JavaOnlyArray.of("positive"),
            ))
    val dialog = shownDialog()
    assertEquals("It can't be undone.", dialog.findViewById<TextView>(android.R.id.message)?.text)
    val title = dialog.findViewById<TextView>(androidx.appcompat.R.id.alertTitle)!!
    assertEquals("Delete?", title.text)
    assertTrue(title.isAccessibilityHeading)
    // The destructive button's text is in the error color, the other's isn't.
    val error = MaterialColors.getColor(dialog.context, androidx.appcompat.R.attr.colorError, 0)
    assertEquals(error, dialog.getButton(DialogInterface.BUTTON_POSITIVE).currentTextColor)
    assertNotEquals(error, dialog.getButton(DialogInterface.BUTTON_NEGATIVE).currentTextColor)

    dialog.getButton(DialogInterface.BUTTON_POSITIVE).performClick()
    idle()
    // The click, and not the dismissal that follows it.
    assertEquals(listOf(listOf<Any?>("buttonClicked", DialogInterface.BUTTON_POSITIVE)), action.calls)
  }

  @Test
  fun repliesDismissedWhenClosedWithoutAButton() {
    val action = show(JavaOnlyMap.of("title", "", "message", "Saved", "buttonNeutral", "OK"))
    val dialog = shownDialog()
    dialog.cancel()
    idle()
    assertEquals(listOf(listOf<Any?>("dismissed")), action.calls)
  }

  @Test
  fun listsItemsWithoutAMessage() {
    val action = show(JavaOnlyMap.of("message", "", "items", JavaOnlyArray.of("One", "Two")))
    val dialog = shownDialog()
    assertEquals(2, dialog.listView.adapter.count)
    shadowOf(dialog.listView).performItemClick(1)
    idle()
    assertEquals(listOf(listOf<Any?>("buttonClicked", 1)), action.calls)
  }

  @Test
  fun keepsQuietOnceReactNativeIsGone() {
    val action = show(JavaOnlyMap.of("message", "Hi", "buttonPositive", "OK"))
    val dialog = shownDialog()
    active = false
    dialog.getButton(DialogInterface.BUTTON_POSITIVE).performClick()
    idle()
    assertTrue(action.calls.isEmpty())
  }

  @Test
  fun showsOneDialogAtATime() {
    val first = show(JavaOnlyMap.of("message", "First"))
    show(JavaOnlyMap.of("message", "Second"))
    assertEquals("Second", shownDialog().findViewById<TextView>(android.R.id.message)?.text)
    // Closing the first one answered its own call.
    assertEquals(listOf(listOf<Any?>("dismissed")), first.calls)
  }

  @Test
  fun waitsForTheAppToComeBackAndHonorsCancelable() {
    module.onHostPause()
    show(JavaOnlyMap.of("message", "Later", "cancelable", false))
    assertTrue(fragments().isEmpty())

    module.onHostResume()
    idle()
    assertFalse(fragments().single().isCancelable)
    // Nothing waits any more.
    module.onHostResume()
    idle()
    assertEquals(1, fragments().size)
  }

  @Test
  fun showsNothingWithoutAnActivity() {
    // Gone by the time the UI thread runs it.
    module.showAlert(JavaOnlyMap.of("message", "Hi"), RecordingCallback(), RecordingCallback())
    currentActivity = null
    idle()
    currentActivity = activity
    assertTrue(fragments().isEmpty())

    // Waiting for an app that comes back without an activity.
    module.onHostPause()
    show(JavaOnlyMap.of("message", "Hi"))
    currentActivity = null
    module.onHostResume()
    idle()
    currentActivity = activity
    assertTrue(fragments().isEmpty())
  }
}

@RunWith(RobolectricTestRunner::class)
class MaterialDialogPackageTest {
  @Test
  fun takesTheDialogModulesPlace() {
    val dialogPackage = MaterialDialogPackage()
    val context = mockk<ReactApplicationContext>(relaxed = true)
    val name = NativeDialogManagerAndroidSpec.NAME
    assertTrue(dialogPackage.getModule(name, context) is MaterialDialogModule)
    assertNull(dialogPackage.getModule("Other", context))
    val info = dialogPackage.getReactModuleInfoProvider().getReactModuleInfos().getValue(name)
    assertEquals(MaterialDialogModule::class.java.name, info.className)
    assertTrue(info.canOverrideExistingModule)
    assertTrue(info.isTurboModule)
  }
}
