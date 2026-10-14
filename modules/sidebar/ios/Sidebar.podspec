Pod::Spec.new do |s|
  s.name           = 'Sidebar'
  s.version        = '1.0.0'
  s.summary        = 'The native sidebar list for the Mac split view'
  s.description    = 'The native sidebar list for the Mac split view'
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
