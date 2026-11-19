package io.robertying.learnx

import android.app.Application
import android.content.res.Configuration
import android.os.Process

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactHost

import expo.modules.ApplicationLifecycleDispatcher
import io.robertying.learnx.dialog.MaterialDialogPackage
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        ExpoReactHostFactory.getDefaultReactHost(
            context = applicationContext,
            jsMainModulePath = "index",
            // Alert.alert shows a Material 3 dialog (dialog/MaterialDialogModule).
            packageList = PackageList(this).packages + MaterialDialogPackage()
        )
    }

    override fun onCreate() {
        super.onCreate()
        // The PDF viewer's isolated process (modules/pdf) starts the app too, and only renders
        // pages: it has no use for React Native, and no access to the app's files.
        if (Process.isIsolated()) {
            return
        }
        loadReactNative(this)
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (Process.isIsolated()) {
            return
        }
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}
