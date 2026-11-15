require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  # Firebase is a Swift package of the app target (ios/learnX.xcodeproj), which a pod can't import: the app hands
  # the module its reporter (ios/learnX/CrashReporting.swift).
  LearnXModule.podspec(s, name: 'LearnXCrashlytics', summary: 'Reports JavaScript errors to Firebase Crashlytics')
end
