# The settings every local module's podspec (modules/*/ios/*.podspec) shares.
module LearnXModule
  # The app's minimum iOS (ios/Podfile's platform; the Xcode project's
  # IPHONEOS_DEPLOYMENT_TARGET).
  DEPLOYMENT_TARGET = '17.6'

  # An Expo module of Swift files next to the podspec, with Swift Testing tests
  # in Tests/ as the 'Tests' test spec (run with scripts/test-ios.sh). The tests
  # are hosted in an app, which some UIKit APIs need.
  def self.podspec(s, name:, summary:)
    s.name           = name
    s.version        = '1.0.0'
    s.summary        = summary
    s.description    = summary
    s.author         = ''
    s.homepage       = 'https://docs.expo.dev/modules/'
    s.platforms      = { :ios => DEPLOYMENT_TARGET }
    s.source         = { git: '' }
    s.static_framework = true

    s.dependency 'ExpoModulesCore'

    s.pod_target_xcconfig = {
      'DEFINES_MODULE' => 'YES'
    }

    s.source_files = '*.swift'

    s.test_spec 'Tests' do |test_spec|
      test_spec.requires_app_host = true
      test_spec.source_files = 'Tests/**/*.swift'
    end
  end
end
