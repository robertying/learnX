Pod::Spec.new do |s|
  s.name           = 'LearnXCrashlytics'
  s.version        = '1.0.0'
  s.summary        = 'Reports JavaScript errors to Firebase Crashlytics'
  s.description    = 'Reports JavaScript errors to Firebase Crashlytics'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.6' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'FirebaseCrashlytics'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
