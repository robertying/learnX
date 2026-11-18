import { queryOptions } from '@tanstack/react-query';
import { getLatestRelease } from 'helpers/update';

/**
 * How often the APKs check the mirror: every so often while open, and on
 * coming back to the app and in the background task once this long has
 * passed (`services/updateNotifications`). The same as the Electron app
 * (electron/updater.ts).
 */
export const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;

/** The mirror's `latest.json`, checked at most every few hours. */
export const latestReleaseQuery = queryOptions({
  queryKey: ['latestRelease'],
  queryFn: getLatestRelease,
  staleTime: UPDATE_CHECK_INTERVAL,
});
