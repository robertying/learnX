require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  LearnXModule.podspec(s, name: 'LearnXWindows', summary: 'Which of the app windows an event is for, and opening new ones')
end
