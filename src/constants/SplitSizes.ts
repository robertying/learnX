/** The split views' sizes, in points (`navigation/SplitView`, `NativeSplitView`). */
const SplitSizes = {
  // The list column of the JS split view. The native one goes by UIKit's
  // default.
  masterWidth: 320,
  // How far the Electron app's list column can be dragged (`SplitDivider`):
  // from about a phone's width to wide enough for long titles on one line.
  minMasterWidth: 280,
  maxMasterWidth: 640,
  // Width of an iPad mini in portrait. No split at or below it.
  maxCollapsedWidth: 744,
  // Narrowest detail pane beside the list on Mac. Below UIKit's default, which
  // is about 450, so that the list fits beside it in the narrowest window
  // (minimumWindowWidth in ios/learnX/SceneDelegate.swift).
  minDetailWidth: 400,
};

export default SplitSizes;
