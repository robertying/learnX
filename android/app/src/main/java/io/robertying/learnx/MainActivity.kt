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
                // root component's initial props (helpers/launchOptions.ts).
                override fun getLaunchOptions(): Bundle? =
                    intent?.getStringExtra(MOCK_LATENCY)?.let { latency ->
                        Bundle().apply { putString(MOCK_LATENCY, latency) }
                    }
            }
        )

    private companion object {
        const val MOCK_LATENCY = "mockLatency"
    }
}
