# Libraries ship their own keep rules as consumer ProGuard files (React Native,
# Hermes, Expo modules, Reanimated, Worklets, Screens, Room, WorkManager, Okio),
# so only what this app needs on top of them goes here.

# Crash reports: file names and line numbers in stack traces, and exception
# class names (Firebase Crashlytics' recommended rules).
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# Classes referenced but never loaded on Android; R8 stops on missing classes
# without these.
-dontwarn com.facebook.react.**
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn okio.**
-dontwarn javax.lang.model.element.Element
-dontwarn javax.lang.model.type.TypeMirror
-dontwarn javax.lang.model.type.TypeVisitor
-dontwarn javax.lang.model.util.SimpleTypeVisitor7
