require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  LearnXModule.podspec(s, name: 'LearnXSpotlight', summary: 'Indexes notices, assignments and files in Spotlight')

  s.frameworks = 'CoreSpotlight'
end
