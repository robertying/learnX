package io.robertying.learnx.pdf

import android.content.Context
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.ReactContext
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk

/**
 * A React context around [base], as the app gives its views, without React Native's runtime: an event a view sends
 * goes nowhere.
 */
@Suppress("DEPRECATION")
fun reactContext(base: Context): ReactContext =
  spyk(BridgeReactContext(base)) {
    every { isBridgeless } returns false
    every { catalystInstance } returns mockk(relaxed = true)
  }
