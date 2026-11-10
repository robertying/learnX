Pod::Spec.new do |s|
  s.name           = 'LearnXShare'
  s.version        = '1.0.0'
  s.summary        = 'Hands files shared through the share extension to JS'
  s.description    = 'Hands files shared through the share extension to JS'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '17.6' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
