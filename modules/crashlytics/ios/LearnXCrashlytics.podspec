Pod::Spec.new do |s|
  s.name           = 'LearnXCrashlytics'
  s.version        = '1.0.0'
  s.summary        = 'Reports JavaScript errors to Firebase Crashlytics'
  s.description    = 'Reports JavaScript errors to Firebase Crashlytics'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.6' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '6.0'

  s.dependency 'ExpoModulesCore'
  s.dependency 'FirebaseCrashlytics'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "*.swift"

  # Run with scripts/test-ios.sh. Hosted in an app, which some UIKit APIs need.
  s.test_spec 'Tests' do |test_spec|
    test_spec.requires_app_host = true
    test_spec.source_files = 'Tests/**/*.swift'
  end
end
