Pod::Spec.new do |s|
  s.name           = 'LearnXSpotlight'
  s.version        = '1.0.0'
  s.summary        = 'Indexes assignments and notices in Spotlight and keeps the next deadlines for Siri'
  s.description    = 'Indexes assignments and notices in Spotlight and keeps the next deadlines for Siri'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.6' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreSpotlight'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
