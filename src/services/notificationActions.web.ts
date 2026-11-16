import type * as Native from './notificationActions';

/**
 * The Electron app's notifications have no action buttons (Favorite,
 * Archive, Remind Later): a click opens the item (`useNotificationTaps`).
 */
export const handleNotificationAction: typeof Native.handleNotificationAction =
  async () => {};

export const setUpNotificationActions: typeof Native.setUpNotificationActions =
  () => ({ remove: () => {} });
