Pod::Spec.new do |s|
  s.name           = 'LearnXMenus'
  s.version        = '1.0.0'
  s.summary        = 'Menu bar commands, key commands and context menus for iPad and Mac'
  s.description    = 'Menu bar commands, key commands and context menus for iPad and Mac'
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
