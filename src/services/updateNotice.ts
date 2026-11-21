import * as Notifications from 'expo-notifications';
import { useAuthStore } from 'data/auth';
import { hasSavedLogin, loadCredentials } from 'data/credentials';
import { addNotifiedKeys, getNotifiedKeys } from 'data/notified';
import { getSettings } from 'data/settings';
import { t } from 'helpers/i18n';
import { recordError } from 'services/crashReporting';
import { notificationChannels } from 'services/notifications';
import { immediateTrigger } from 'services/scheduledNotifications';

/**
 * Says a new version is out, once a version, where learnX updates itself
 * (`services/updateNotifications`), also while the app is in front: Settings'
 * badge is easy to miss. Not with Settings › Notifications › New Versions
 * off, and then it counts as said. Not before logging in either, where it
 * would open no Settings to update from: the watchers say it once someone
 * logs in (`notifyOnLogin`). Never asks for the permission: without it,
 * nothing shows.
 */
export const notifyUpdate = async ({
  version,
  body,
}: {
  version: string;
  body: string;
}) => {
  const loggedIn = hasSavedLogin(await loadCredentials());
  const key = `update:${version}`;
  if (!loggedIn || getNotifiedKeys().has(key)) {
    return;
  }
  addNotifiedKeys([key]);
  if (!getSettings().notifications.appUpdates) {
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifyNewVersion'),
        body: `v${version}\n${body}`,
        // Opens Settings, with the update on top.
        data: { type: 'update' },
      },
      trigger: immediateTrigger(notificationChannels.updates),
    });
  } catch (error) {
    recordError(error, 'Posting the new version notification');
  }
};

/**
 * Calls `notify` when someone logs in, for the version found while nobody
 * was. Only once the login has gone through: `data/login` saves the login
 * before it claims the data, which forgets what was said (`data/notified`) and
 * cached, so a version said at the save would be said again after it. Also
 * after logging in again, where `notifyUpdate` says nothing twice. Returns the
 * unsubscribe.
 */
export const notifyOnLogin = (notify: () => void) =>
  useAuthStore.subscribe((state, previous) => {
    if (state.loggedIn && !previous.loggedIn) {
      notify();
    }
  });
