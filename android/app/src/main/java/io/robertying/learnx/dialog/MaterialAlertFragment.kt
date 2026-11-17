package io.robertying.learnx.dialog

import android.app.Dialog
import android.content.DialogInterface
import android.graphics.Color
import android.os.Bundle
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.fragment.app.DialogFragment
import com.google.android.material.color.MaterialColors
import com.google.android.material.dialog.MaterialAlertDialogBuilder

/**
 * The dialog behind React Native's `Alert.alert` on Android: a Material 3 dialog in the app's theme,
 * with a destructive button's text in the error color.
 */
class MaterialAlertFragment() : DialogFragment(), DialogInterface.OnClickListener {

  private var listener: MaterialDialogModule.Listener? = null

  internal constructor(listener: MaterialDialogModule.Listener?, arguments: Bundle) : this() {
    this.listener = listener
    setArguments(arguments)
  }

  override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
    val arguments = requireArguments()
    val builder = MaterialAlertDialogBuilder(requireActivity())
    arguments.getString(ARG_TITLE)?.takeIf { it.isNotEmpty() }?.let { builder.setTitle(it) }
    arguments.getString(ARG_BUTTON_POSITIVE)?.let { builder.setPositiveButton(it, this) }
    arguments.getString(ARG_BUTTON_NEGATIVE)?.let { builder.setNegativeButton(it, this) }
    arguments.getString(ARG_BUTTON_NEUTRAL)?.let { builder.setNeutralButton(it, this) }
    val message = arguments.getString(ARG_MESSAGE)?.takeIf { it.isNotEmpty() }
    if (message != null) {
      builder.setMessage(message)
    } else {
      arguments.getCharSequenceArray(ARG_ITEMS)?.let { builder.setItems(it, this) }
    }
    val dialog = builder.create()
    val destructive = arguments.getIntArray(ARG_DESTRUCTIVE_BUTTONS) ?: IntArray(0)
    dialog.setOnShowListener {
      // Screen readers announce the title as a heading, as React Native's own dialog does.
      dialog.findViewById<TextView>(androidx.appcompat.R.id.alertTitle)?.let {
        ViewCompat.setAccessibilityHeading(it, true)
      }
      val error =
          MaterialColors.getColor(
              dialog.context, androidx.appcompat.R.attr.colorError, Color.RED)
      destructive.forEach { which -> dialog.getButton(which)?.setTextColor(error) }
    }
    return dialog
  }

  override fun onClick(dialog: DialogInterface, which: Int) {
    listener?.onClick(dialog, which)
  }

  override fun onDismiss(dialog: DialogInterface) {
    super.onDismiss(dialog)
    listener?.onDismiss(dialog)
  }

  internal companion object {
    const val ARG_TITLE = "title"
    const val ARG_MESSAGE = "message"
    const val ARG_BUTTON_POSITIVE = "button_positive"
    const val ARG_BUTTON_NEGATIVE = "button_negative"
    const val ARG_BUTTON_NEUTRAL = "button_neutral"
    const val ARG_ITEMS = "items"
    /** The `DialogInterface.BUTTON_*` ids of the buttons that delete or discard something. */
    const val ARG_DESTRUCTIVE_BUTTONS = "destructive_buttons"
  }
}
