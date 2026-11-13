package io.robertying.learnx

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "learnX"

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
        super.onCreate(null)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
                // Test runs set the app up with launch arguments (Maestro's
                // launchApp arguments arrive as intent extras): they become the
                // root component's initial props (services/launchOptions.ts).
                // Only these string extras are passed, and only in debug and
                // E2E builds (TAKES_LAUNCH_OPTIONS); the test login ones are
                // only read by debug builds and E2E bundles (TEST_LOGIN).
                override fun getLaunchOptions(): Bundle? {
                    if (!BuildConfig.TAKES_LAUNCH_OPTIONS) return null
                    val extras = LAUNCH_OPTIONS.mapNotNull { key ->
                        intent?.getStringExtra(key)?.let { key to it }
                    }
                    if (extras.isEmpty()) return null
                    return Bundle().apply {
                        extras.forEach { (key, value) -> putString(key, value) }
                    }
                }
            }
        )

    private companion object {
        val LAUNCH_OPTIONS = listOf("mockLatency", "storeReport", "liveUsername", "liveFingerprint")
    }
}
