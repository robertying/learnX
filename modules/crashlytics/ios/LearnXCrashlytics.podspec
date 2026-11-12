require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  LearnXModule.podspec(s, name: 'LearnXCrashlytics', summary: 'Reports JavaScript errors to Firebase Crashlytics')

  s.dependency 'FirebaseCrashlytics'
end
