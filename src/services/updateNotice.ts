import * as Notifications from 'expo-notifications';
import { addNotifiedKeys, getNotifiedKeys } from 'data/notified';
import { getSettings } from 'data/settings';
import { t } from 'helpers/i18n';
import { recordError } from 'services/crashReporting';
import { notificationChannels } from 'services/notifications';
import { immediateTrigger } from 'services/scheduledNotifications';

/**
 * Says a new version is out, once a version, where learnX updates itself
 * (`services/updateNotifications`). Not while the app is in front
 * (`inFront`), where Settings' badge and its update row already show it, and
 * not with Settings › Notifications › New Versions off; either way it counts
 * as said. Never asks for the permission: without it, nothing shows.
 */
export const notifyUpdate = async ({
  version,
  body,
  inFront,
}: {
  version: string;
  body: string;
  inFront: boolean;
}) => {
  const key = `update:${version}`;
  if (getNotifiedKeys().has(key)) {
    return;
  }
  addNotifiedKeys([key]);
  if (inFront || !getSettings().notifications.appUpdates) {
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('foundNewVersion', { version }),
        body,
        // Opens Settings, with the update on top.
        data: { type: 'update' },
      },
      trigger: immediateTrigger(notificationChannels.updates),
    });
  } catch (error) {
    recordError(error, 'Posting the new version notification');
  }
};
