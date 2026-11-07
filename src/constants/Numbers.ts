const Numbers = {
  // Master pane of the JS split view. The native one goes by UIKit's default.
  splitViewMasterWidth: 320,
  // Width of an iPad mini in portrait. No split at or below it.
  splitViewMaxCollapsedWidth: 744,
  // Narrowest detail pane beside the list on Mac. Below UIKit's default, which
  // is about 450, so that the list fits beside it in the narrowest window
  // (minimumWindowWidth in ios/learnX/SceneDelegate.swift).
  splitViewMinDetailWidth: 400,
};

export default Numbers;
