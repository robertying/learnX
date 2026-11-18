import { t } from 'helpers/i18n';
import { bridge } from 'web/bridge';
import { pendingUpdate, subscribeToUpdates } from 'services/electronUpdates';
import { notifyUpdate } from 'services/updateNotice';

/**
 * Whether this run of the Electron app takes updates (electron/updater.ts):
 * a packaged Windows or Linux build.
 */
export const checksForUpdates = () => bridge().updates.checks();

let watching = false;

/**
 * Says when the main process has a new version ready (`notifyUpdate`):
 * downloaded and installing on quit, or for a .deb, out to download. The
 * main process checks every few hours (electron/updater.ts), also while the
 * window is closed to the tray, where this page keeps running. Runs from
 * `index.js`; safe to call more than once.
 */
export const watchUpdates = () => {
  if (watching) {
    return;
  }
  watching = true;
  subscribeToUpdates(() => {
    const update = pendingUpdate();
    if (update) {
      void notifyUpdate({
        version: update.version,
        body: update.download
          ? t('updateNotificationBody')
          : t('updateNotificationReadyBody'),
      });
    }
  });
};

/** The main process checks on its own timer (electron/updater.ts). */
export const checkForUpdate = async () => {};
