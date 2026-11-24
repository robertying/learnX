require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  LearnXModule.podspec(s, name: 'LearnXMenuBar', summary: "The Mac app's menu bar item, Dock icon and login item")
end
