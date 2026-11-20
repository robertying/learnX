package io.robertying.learnx.perf

import android.app.Activity
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Tells Android when the first screen has its content (`services/perf`), so the launch's time to full display shows
 * in `am start -W`, the log (`Fully drawn`) and Google Play's startup vitals.
 */
class PerfModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LearnXPerf")

    AsyncFunction("reportFullyDrawn") { reportFullyDrawn(appContext.currentActivity) }.runOnQueue(Queues.MAIN)
  }
}

/** Android keeps the first report of an activity's launch and ignores later ones. */
internal fun reportFullyDrawn(activity: Activity?) {
  activity?.reportFullyDrawn()
}
