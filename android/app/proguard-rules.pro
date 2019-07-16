# Android

-dontnote com.google.**
-dontnote android.net.http.*
-dontnote org.apache.commons.codec.**
-dontnote org.apache.http.**
-dontnote kotlin.**


# React Native

-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

-dontnote com.facebook.**
-dontwarn com.facebook.react.**
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }


# okhttp

-keepattributes InnerClasses
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontnote okhttp3.**
-dontwarn javax.annotation.**
-dontnote org.conscrypt.**
-dontwarn org.conscrypt.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase


# okio

-dontnote sun.misc.Unsafe
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontnote okio.**
-dontwarn okio.**


# Expo

-dontnote org.unimodules.**

-keepclassmembers class * {
  @org.unimodules.core.interfaces.ExpoProp *;
}
-keepclassmembers class * {
  @org.unimodules.core.interfaces.ExpoMethod *;
}

-keepclassmembers class * {
  @**.expo.core.interfaces.ExpoProp *;
}
-keepclassmembers class * {
  @**.expo.core.interfaces.ExpoMethod *;
}

-keep @**.expo.core.interfaces.DoNotStrip class *
-keepclassmembers class * {
  @**.expo.core.interfaces.DoNotStrip *;
}

-keep class expo.modules.** { *; }


# Crashlytics

-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

-dontwarn com.crashlytics.android.ndk.CrashlyticsNdk

-dontnote com.crashlytics.android.core.CrashlyticsController
-dontnote io.fabric.sdk.android.**


# Others

-dontnote ca.jaysoo.extradimensions.**
-dontnote com.BV.LinearGradient.**
-dontnote com.cmcewen.blurview.**
-dontnote com.microsoft.codepush.**
-dontnote com.reactnativecommunity.webview.**
-dontnote com.swmansion.gesturehandler.**
-dontnote com.swmansion.reanimated.**
-dontnote com.wix.interactable.**

-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
