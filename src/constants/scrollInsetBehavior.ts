import DeviceInfo from 'constants/DeviceInfo';

/**
 * Whether a screen is laid out under its header, which the top safe area then
 * takes in. So it is on iPhone and iPad, where the header is glass (or blends
 * into the screen). The Mac's header is opaque, with the screen laid out below
 * it, yet in a split view's later columns the top safe area still takes in the
 * window's toolbar: keeping clear of it there would leave that much blank
 * above the content.
 */
export const underHeader = () => !DeviceInfo.isMac();

/**
 * How a scroll view keeps clear of the header (`contentInsetAdjustmentBehavior`):
 * by the safe area where the screen is under the header (`underHeader`).
 */
export const scrollInsetBehavior = underHeader()
  ? ('automatic' as const)
  : ('never' as const);
