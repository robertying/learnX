import type * as Native from './notificationActions';

/**
 * The Electron app has no notification action buttons yet: notifications
 * come with the tray (phase 4 of the plan).
 */
export const handleNotificationAction: typeof Native.handleNotificationAction =
  async () => {};

export const setUpNotificationActions: typeof Native.setUpNotificationActions =
  () => ({ remove: () => {} });
