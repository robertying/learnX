package io.robertying.learnx.dialog

import com.facebook.fbreact.specs.NativeDialogManagerAndroidSpec
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** Registers [MaterialDialogModule] over React Native's own dialog module. */
class MaterialDialogPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == NativeDialogManagerAndroidSpec.NAME) MaterialDialogModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
        NativeDialogManagerAndroidSpec.NAME to
            ReactModuleInfo(
                name = NativeDialogManagerAndroidSpec.NAME,
                className = MaterialDialogModule::class.java.name,
                canOverrideExistingModule = true,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true,
            ))
  }
}
