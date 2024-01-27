# react native

-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

-keep @com.facebook.proguard.annotations.DoNotStripAny class * {
    *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

-dontwarn com.facebook.react.**
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep,includedescriptorclasses class com.facebook.react.turbomodule.core.** { *; }


# hermes

-keep class com.facebook.jni.** { *; }


# okio

-keep class sun.misc.Unsafe { *; }
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn okio.**


# expo

-keep class expo.modules.** { *; }
-keep class org.unimodules.** { *; }

-keepclassmembers public class com.facebook.react.ReactActivityDelegate {
  protected *;
  private ReactDelegate mReactDelegate;
}
-keepclassmembers public class com.facebook.react.ReactActivity {
  private final ReactActivityDelegate mDelegate;
}

-keepclassmembers public class com.facebook.react.ReactNativeHost {
  protected *;
}

-keepclassmembers public class expo.modules.ExpoModulesPackageList {
  public *;
}

-keepnames class * extends expo.modules.core.BasePackage
-keepnames class * implements expo.modules.core.interfaces.Package

-keep @expo.modules.core.interfaces.DoNotStrip class *
-keepclassmembers class * {
  @expo.modules.core.interfaces.DoNotStrip *;
}

-keep class * implements expo.modules.kotlin.records.Record {
  *;
}
-keep enum * implements expo.modules.kotlin.types.Enumerable {
  *;
}
-keepnames class kotlin.Pair

-keep,allowoptimization,allowobfuscation class * extends expo.modules.kotlin.modules.Module {
  public <init>();
  public expo.modules.kotlin.modules.ModuleDefinitionData definition();
}

-keepclassmembers class * implements expo.modules.kotlin.views.ExpoView {
  public <init>(android.content.Context);
  public <init>(android.content.Context, expo.modules.kotlin.AppContext);
}

-keepclassmembers class * {
  expo.modules.kotlin.viewevent.ViewEventCallback *;
}

-keepclassmembers class * {
  expo.modules.kotlin.viewevent.ViewEventDelegate *;
}


# crash reports

-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception


# reanimated

-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }


# others

-dontwarn javax.lang.model.element.Element
-dontwarn javax.lang.model.type.TypeMirror
-dontwarn javax.lang.model.type.TypeVisitor
-dontwarn javax.lang.model.util.SimpleTypeVisitor7
