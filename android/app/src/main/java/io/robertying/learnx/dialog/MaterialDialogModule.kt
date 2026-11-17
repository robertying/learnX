package io.robertying.learnx.dialog

import android.content.DialogInterface
import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager
import com.facebook.fbreact.specs.NativeDialogManagerAndroidSpec
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule

/**
 * Takes the place of React Native's `DialogManagerAndroid`, so every `Alert.alert` shows a
 * Material 3 dialog ([MaterialAlertFragment]). It keeps React Native's behavior: one dialog at a
 * time, and a dialog asked for while the app is in the background shows when it comes back. The
 * patched `Alert.js` adds `destructiveButtons`, the buttons whose style is `destructive`.
 */
@ReactModule(name = NativeDialogManagerAndroidSpec.NAME, canOverrideExistingModule = true)
class MaterialDialogModule(reactContext: ReactApplicationContext) :
    NativeDialogManagerAndroidSpec(reactContext), LifecycleEventListener {

  private var isInForeground = false
  private var pending: MaterialAlertFragment? = null

  internal inner class Listener(private val callback: Callback) :
      DialogInterface.OnClickListener, DialogInterface.OnDismissListener {
    private var consumed = false

    override fun onClick(dialog: DialogInterface, which: Int) {
      reply(ACTION_BUTTON_CLICKED, which)
    }

    override fun onDismiss(dialog: DialogInterface) {
      reply(ACTION_DISMISSED)
    }

    private fun reply(vararg args: Any) {
      if (!consumed && reactApplicationContext.hasActiveReactInstance()) {
        callback.invoke(*args)
        consumed = true
      }
    }
  }

  override fun getTypedExportedConstants(): Map<String, Any> = CONSTANTS

  override fun initialize() {
    reactApplicationContext.addLifecycleEventListener(this)
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  override fun onHostPause() {
    isInForeground = false
  }

  override fun onHostDestroy() = Unit

  override fun onHostResume() {
    isInForeground = true
    val fragment = pending ?: return
    val fragmentManager = fragmentManager ?: return
    pending = null
    dismissExisting(fragmentManager)
    fragment.show(fragmentManager, FRAGMENT_TAG)
  }

  override fun showAlert(options: ReadableMap, errorCallback: Callback, actionCallback: Callback) {
    if (fragmentManager == null) {
      errorCallback.invoke("Tried to show an alert while not attached to an Activity")
      return
    }
    val arguments = arguments(options)
    val cancelable = if (options.hasKey(KEY_CANCELABLE)) options.getBoolean(KEY_CANCELABLE) else null
    UiThreadUtil.runOnUiThread {
      val fragmentManager = fragmentManager ?: return@runOnUiThread
      dismissExisting(fragmentManager)
      val fragment = MaterialAlertFragment(Listener(actionCallback), arguments)
      cancelable?.let { fragment.isCancelable = it }
      if (isInForeground && !fragmentManager.isStateSaved) {
        fragment.show(fragmentManager, FRAGMENT_TAG)
      } else {
        pending = fragment
      }
    }
  }

  private val fragmentManager: FragmentManager?
    get() = (reactApplicationContext.currentActivity as? FragmentActivity)?.supportFragmentManager

  private fun dismissExisting(fragmentManager: FragmentManager) {
    if (!isInForeground) {
      return
    }
    val existing = fragmentManager.findFragmentByTag(FRAGMENT_TAG) as? MaterialAlertFragment
    if (existing?.isResumed == true) {
      existing.dismiss()
    }
  }

  internal companion object {
    private const val FRAGMENT_TAG = "io.robertying.learnx.dialog.MaterialDialogModule"
    private const val ACTION_BUTTON_CLICKED = "buttonClicked"
    private const val ACTION_DISMISSED = "dismissed"
    private const val KEY_TITLE = "title"
    private const val KEY_MESSAGE = "message"
    private const val KEY_BUTTON_POSITIVE = "buttonPositive"
    private const val KEY_BUTTON_NEGATIVE = "buttonNegative"
    private const val KEY_BUTTON_NEUTRAL = "buttonNeutral"
    private const val KEY_ITEMS = "items"
    private const val KEY_CANCELABLE = "cancelable"
    private const val KEY_DESTRUCTIVE_BUTTONS = "destructiveButtons"

    private val BUTTONS =
        mapOf(
            "positive" to DialogInterface.BUTTON_POSITIVE,
            "negative" to DialogInterface.BUTTON_NEGATIVE,
            "neutral" to DialogInterface.BUTTON_NEUTRAL,
        )

    private val CONSTANTS: Map<String, Any> =
        mapOf(
            ACTION_BUTTON_CLICKED to ACTION_BUTTON_CLICKED,
            ACTION_DISMISSED to ACTION_DISMISSED,
            KEY_BUTTON_POSITIVE to DialogInterface.BUTTON_POSITIVE,
            KEY_BUTTON_NEGATIVE to DialogInterface.BUTTON_NEGATIVE,
            KEY_BUTTON_NEUTRAL to DialogInterface.BUTTON_NEUTRAL,
        )

    /** The fragment's arguments for an `Alert.alert` call's options. */
    fun arguments(options: ReadableMap): Bundle =
        Bundle().apply {
          fun string(key: String, argument: String) {
            if (options.hasKey(key)) putString(argument, options.getString(key))
          }
          string(KEY_TITLE, MaterialAlertFragment.ARG_TITLE)
          string(KEY_MESSAGE, MaterialAlertFragment.ARG_MESSAGE)
          string(KEY_BUTTON_POSITIVE, MaterialAlertFragment.ARG_BUTTON_POSITIVE)
          string(KEY_BUTTON_NEGATIVE, MaterialAlertFragment.ARG_BUTTON_NEGATIVE)
          string(KEY_BUTTON_NEUTRAL, MaterialAlertFragment.ARG_BUTTON_NEUTRAL)
          options.getArray(KEY_ITEMS)?.let { items ->
            putCharSequenceArray(
                MaterialAlertFragment.ARG_ITEMS,
                Array<CharSequence>(items.size()) { items.getString(it) ?: "" },
            )
          }
          options.getArray(KEY_DESTRUCTIVE_BUTTONS)?.let { buttons ->
            putIntArray(
                MaterialAlertFragment.ARG_DESTRUCTIVE_BUTTONS,
                (0 until buttons.size()).mapNotNull { BUTTONS[buttons.getString(it)] }.toIntArray(),
            )
          }
        }
  }
}
