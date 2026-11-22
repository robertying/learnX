package io.robertying.learnx.background

import android.app.ActivityManager
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Whether Android lets the background sync (a WorkManager job) run: "on", or "off" when the user has restricted
 * learnX's background battery use (App info › Battery › Restricted, or "Allow background usage" turned off), which
 * keeps its jobs from running until the app is opened. Battery optimization, the default, still runs them in
 * Doze's maintenance windows, so it isn't reported.
 */
fun backgroundRefreshState(context: Context): String {
  val activityManager = context.getSystemService(ActivityManager::class.java)
  return if (activityManager?.isBackgroundRestricted == true) "off" else "on"
}

class BackgroundRefreshModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BackgroundRefresh")

    AsyncFunction("getState") {
      appContext.reactContext?.let(::backgroundRefreshState) ?: "on"
    }
  }
}
