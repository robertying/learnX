import { AppState } from 'react-native';
import Updater from 'modules/updater';
import { latestReleaseQuery } from 'data/latestRelease';
import { queryClient } from 'data/queryClient';
import { t } from 'helpers/i18n';
import { isNewerRelease, type Release } from 'helpers/update';
import { clearDownloadedUpdate } from 'services/update';
import { notifyOnLogin, notifyUpdate } from 'services/updateNotice';

/**
 * Whether learnX checks for its own updates: only the APKs
 * (`modules/updater`); Google Play and the App Store update the others.
 */
export const checksForUpdates = () => Updater?.isSupported ?? false;

const notifyRelease = (release: Release) =>
  isNewerRelease(release)
    ? notifyUpdate({
        version: release.version,
        body: t('updateNotificationBody'),
      })
    : Promise.resolve();

let watching = false;

/**
 * Keeps the APKs' update check going while the app runs: on coming back to
 * the app once the last check is a few hours old (`latestReleaseQuery`), and
 * says when one finds a new version (`notifyUpdate`). The open app checks
 * every few hours too (`hooks/useAvailableUpdate`), and the background task
 * with `checkForUpdate`. Also deletes the APK of an update that installed:
 * installing it ended the app before it could. Runs from `index.js`; safe to
 * call more than once.
 */
export const watchUpdates = () => {
  if (watching || !checksForUpdates()) {
    return;
  }
  watching = true;
  clearDownloadedUpdate();
  queryClient.getQueryCache().subscribe(event => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      event.query.queryKey[0] === latestReleaseQuery.queryKey[0]
    ) {
      void notifyRelease(event.query.state.data as Release);
    }
  });
  // A version found before logging in, said once someone does. Logging in
  // empties the query cache, so this asks again (or takes the cached answer
  // when there is still one).
  notifyOnLogin(() => {
    void checkForUpdate();
  });
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      queryClient.prefetchQuery(latestReleaseQuery).catch(() => {});
    }
  });
};

/**
 * The background task's check, so a new version is said while learnX isn't
 * open; at most every few hours, as in the app. Offline or with the mirror
 * down, nothing.
 */
export const checkForUpdate = async () => {
  if (!checksForUpdates()) {
    return;
  }
  try {
    await notifyRelease(await queryClient.fetchQuery(latestReleaseQuery));
  } catch {}
};
