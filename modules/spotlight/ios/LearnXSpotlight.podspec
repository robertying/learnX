require File.expand_path('../../learnx_module', File.dirname(__FILE__))

Pod::Spec.new do |s|
  LearnXModule.podspec(s, name: 'LearnXSpotlight', summary: 'Indexes assignments and notices in Spotlight and keeps the next deadlines for Siri')

  s.frameworks = 'CoreSpotlight'
end
