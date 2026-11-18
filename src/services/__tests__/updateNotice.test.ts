import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getNotifiedKeys, resetNotified } from 'data/notified';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import { notifyUpdate } from 'services/updateNotice';

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const update = (overrides: { version?: string; inFront?: boolean } = {}) =>
  notifyUpdate({ version: '19.1.0', body: 'Body', inFront: false, ...overrides });

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
  await update({ version: '19.2.0' });
  expect(schedule).toHaveBeenCalledTimes(2);
});

it('stays quiet while the app is in front, and later too', async () => {
  await update({ inFront: true });
  await update();
  expect(schedule).not.toHaveBeenCalled();
  expect(getNotifiedKeys().has('update:19.1.0')).toBe(true);
});

it('stays quiet with New Versions off', async () => {
  expect(getSettings().notifications.appUpdates).toBe(true);
  setSetting('notifications', {
    ...getSettings().notifications,
    appUpdates: false,
  });
  await update();
  expect(schedule).not.toHaveBeenCalled();
});

it("doesn't throw when the notification can't be posted", async () => {
  schedule.mockRejectedValueOnce(new Error('No permission'));
  await expect(update()).resolves.toBeUndefined();
});
