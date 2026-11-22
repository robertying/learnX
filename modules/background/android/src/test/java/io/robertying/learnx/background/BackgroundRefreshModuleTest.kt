package io.robertying.learnx.background

import android.app.ActivityManager
import android.content.Context
import org.robolectric.RuntimeEnvironment
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class BackgroundRefreshModuleTest {
  private val context: Context = RuntimeEnvironment.getApplication()
  private val activityManager = shadowOf(context.getSystemService(ActivityManager::class.java))

  @Test
  fun definesItsFunctions() {
    BackgroundRefreshModule().definition()
  }

  @Test
  fun isOnByDefault() {
    assertEquals("on", backgroundRefreshState(context))
  }

  @Test
  fun isOnWithoutAContext() {
    assertEquals("on", backgroundRefreshState(null))
  }

  @Test
  fun isOffWhenBackgroundUseIsRestricted() {
    activityManager.setBackgroundRestricted(true)
    assertEquals("off", backgroundRefreshState(context))
  }
}
