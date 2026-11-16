import type * as Native from './surfaces';

/**
 * What the app keeps in step outside its window (widgets, Spotlight, App
 * Intents, reminders, the calendar) has no counterpart in the Electron app
 * yet: reminders come with the tray (phase 4 of the plan), and the rest
 * stays out.
 */
export const subscribeSurfaceErrors: typeof Native.subscribeSurfaceErrors =
  () => () => {};

export const MISSING_CHECK_MS: typeof Native.MISSING_CHECK_MS = 60 * 1000;

export const SETTINGS_SETTLE_MS: typeof Native.SETTINGS_SETTLE_MS = 1000;

export const refreshSurfaces: typeof Native.refreshSurfaces = async () => {};

export const clearSurfaces: typeof Native.clearSurfaces = async () => {};

export const watchSurfaces: typeof Native.watchSurfaces = () => {};
