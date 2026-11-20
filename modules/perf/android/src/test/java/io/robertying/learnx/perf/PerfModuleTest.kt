package io.robertying.learnx.perf

import android.app.Activity
import io.mockk.mockk
import io.mockk.verify
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PerfModuleTest {
  @Test
  fun definesItsFunctions() {
    PerfModule().definition()
  }

  @Test
  fun reportsTheActivityFullyDrawn() {
    val activity = mockk<Activity>(relaxed = true)
    reportFullyDrawn(activity)
    verify(exactly = 1) { activity.reportFullyDrawn() }
  }

  @Test
  fun doesNothingWithoutAnActivity() {
    reportFullyDrawn(null)
  }
}
