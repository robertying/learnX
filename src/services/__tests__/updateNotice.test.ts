import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { initialAuth, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';
import { getNotifiedKeys, resetNotified } from 'data/notified';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import { notifyOnLogin, notifyUpdate } from 'services/updateNotice';

// Loads expo-updates and the Crashlytics module, neither of which Jest can.
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const update = (version = '19.1.0') => notifyUpdate({ version, body: 'Body' });

const login = {
  username: 'user',
  password: 'password',
  fingerPrint: 'fp',
  fingerGenPrint: 'fp2',
  fingerGenPrint3: 'fp3',
};
const logIn = () => useCredentialsStore.setState({ credentials: login });
const logOut = () => useCredentialsStore.setState({ credentials: null });

beforeEach(() => {
  resetNotified();
  resetSettings();
  logIn();
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

describe('before logging in', () => {
  beforeEach(logOut);

  it('stays quiet, and keeps the version to say later', async () => {
    await update();
    expect(schedule).not.toHaveBeenCalled();
    expect(getNotifiedKeys().has('update:19.1.0')).toBe(false);
    logIn();
    await update();
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('calls back once a login goes through, not on later changes', () => {
    useAuthStore.setState(initialAuth);
    const notify = jest.fn();
    const unsubscribe = notifyOnLogin(notify);
    // Saved, but not through yet (data/login).
    logIn();
    useAuthStore.setState({ loggingIn: true });
    expect(notify).not.toHaveBeenCalled();
    useAuthStore.setState({ loggingIn: false, loggedIn: true });
    expect(notify).toHaveBeenCalledTimes(1);
    useAuthStore.setState({ reloginRequested: false });
    expect(notify).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
