import DeviceInfo from 'constants/DeviceInfo';

/**
 * How a scroll view keeps clear of the header (`contentInsetAdjustmentBehavior`).
 * On iPhone and iPad it insets itself by the safe area, which takes in the
 * header it scrolls under. The Mac's header is opaque, with the screen laid
 * out below it, yet in a split view's later columns the safe area still takes
 * in the window's toolbar: an automatic inset would leave that much blank
 * above the content.
 */
export const scrollInsetBehavior = DeviceInfo.isMac()
  ? ('never' as const)
  : ('automatic' as const);
