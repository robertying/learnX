require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  LearnXModule.podspec(s, name: 'LearnXQuickLook', summary: "Quick Look's preview of a downloaded file")
  s.frameworks = 'QuickLook'
end
