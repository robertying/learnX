import type * as Native from './background';

export type { SyncResult } from './background';

/**
 * The Electron app has no background sync yet: it comes with the tray, while
 * the app runs (phase 4 of the plan). A sync skips, as when logged out.
 */
export const SYNC_BUDGET_MS: typeof Native.SYNC_BUDGET_MS = 20_000;

export const syncContent: typeof Native.syncContent = async () => ({
  status: 'skipped',
});

export const notifyContent: typeof Native.notifyContent = async () => [];

export const watchAssignmentChanges: typeof Native.watchAssignmentChanges =
  () => {};

export const setUpBackgroundFetch: typeof Native.setUpBackgroundFetch =
  async () => {};
