require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  LearnXModule.podspec(s, name: 'LearnXBackground', summary: 'Says whether the system lets the background sync run')
end
