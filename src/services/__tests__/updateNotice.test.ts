import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getNotifiedKeys, resetNotified } from 'data/notified';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import { notifyUpdate } from 'services/updateNotice';

// Loads expo-updates and the Crashlytics module, neither of which Jest can.
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const update = (version = '19.1.0') => notifyUpdate({ version, body: 'Body' });

beforeEach(() => {
  resetNotified();
  resetSettings();
});

it('says a new version is out, opening Settings', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await update();
  expect(schedule).toHaveBeenCalledWith({
    content: {
      title: t('foundNewVersion', { version: '19.1.0' }),
      body: 'Body',
      data: { type: 'update' },
    },
    trigger: { channelId: 'updates' },
  });
});

it('says it once a version', async () => {
  await update();
  await update();
  expect(schedule).toHaveBeenCalledTimes(1);
  await update('19.2.0');
  expect(schedule).toHaveBeenCalledTimes(2);
});

it('stays quiet with New Versions off', async () => {
  expect(getSettings().notifications.appUpdates).toBe(true);
  setSetting('notifications', {
    ...getSettings().notifications,
    appUpdates: false,
  });
  await update();
  expect(schedule).not.toHaveBeenCalled();
  // Turning it on later doesn't post about a version already out.
  setSetting('notifications', {
    ...getSettings().notifications,
    appUpdates: true,
  });
  await update();
  expect(schedule).not.toHaveBeenCalled();
  expect(getNotifiedKeys().has('update:19.1.0')).toBe(true);
});

it("doesn't throw when the notification can't be posted", async () => {
  schedule.mockRejectedValueOnce(new Error('No permission'));
  await expect(update()).resolves.toBeUndefined();
});
