Pod::Spec.new do |s|
  s.name           = 'LearnXToast'
  s.version        = '1.0.0'
  s.summary        = 'UIKit views for the toast HUD'
  s.description    = 'UIKit views for the toast HUD'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.6' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
